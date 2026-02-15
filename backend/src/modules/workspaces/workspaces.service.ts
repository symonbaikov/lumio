import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { render } from '@react-email/render';
import * as React from 'react';
import { Resend } from 'resend';
import type { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TimeoutError, retry, withTimeout } from '../../common/utils/async.util';
import {
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceInvitationStatus,
  WorkspaceMember,
  type WorkspaceMemberPermissions,
  WorkspaceRole,
} from '../../entities';
import { Integration, IntegrationToken } from '../../entities';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { BalanceService } from '../balance/balance.service';
import { CategoriesService } from '../categories/categories.service';
import type {
  MemberInvitedEvent,
  MemberJoinedEvent,
  WorkspaceUpdatedEvent,
} from '../notifications/events/notification-events';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { WorkspaceResponseDto, WorkspaceStatsDto } from './dto/workspace-response.dto';

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly auditService: AuditService,
    private readonly balanceService: BalanceService,
    private readonly categoriesService: CategoriesService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private async resolveActorName(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['name', 'email'],
    });

    return user?.name || user?.email || 'User';
  }

  async ensureUserWorkspace(user: User): Promise<Workspace> {
    if (user.workspaceId) {
      const existing = await this.workspaceRepository.findOne({
        where: { id: user.workspaceId },
      });
      if (existing) {
        return existing;
      }
    }

    const workspace = this.workspaceRepository.create({
      name: `${user.name || user.email} workspace`,
      ownerId: user.id,
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);

    await this.workspaceMemberRepository.save({
      workspaceId: savedWorkspace.id,
      userId: user.id,
      role: WorkspaceRole.OWNER,
      invitedById: user.id,
    });

    await this.userRepository.update(user.id, { workspaceId: savedWorkspace.id });
    await this.categoriesService.createSystemCategories(savedWorkspace.id, user.id);
    await this.balanceService.seedDefaultAccounts(savedWorkspace.id);

    return savedWorkspace;
  }

  async getWorkspaceOverview(currentUser: User, requestAppOrigin?: string) {
    const workspace = await this.ensureUserWorkspace(currentUser);

    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId: workspace.id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const invitations = await this.invitationRepository.find({
      where: { workspaceId: workspace.id, status: WorkspaceInvitationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
      },
      members: members.map(member => ({
        id: member.userId,
        email: member.user?.email,
        name: member.user?.name,
        role: member.role,
        permissions: member.permissions,
        joinedAt: member.createdAt,
      })),
      invitations: invitations.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        permissions: invite.permissions,
        status: invite.status,
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        link: this.buildInvitationLink(invite.token, requestAppOrigin),
      })),
    };
  }

  async getWorkspaceMembers(workspaceId: string, userId: string) {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return members.map(member => ({
      id: member.userId,
      email: member.user?.email,
      name: member.user?.name,
      role: member.role,
      permissions: member.permissions,
      joinedAt: member.createdAt,
    }));
  }

  async getWorkspaceInvitations(workspaceId: string, userId: string) {
    await this.requireAdminMembership(workspaceId, userId);

    const invitations = await this.invitationRepository.find({
      where: { workspaceId, status: WorkspaceInvitationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    return invitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      permissions: invite.permissions,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }));
  }

  private async requireAdminMembership(workspaceId: string, userId: string) {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    if (![WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(membership.role)) {
      throw new ForbiddenException('Только владелец или администратор может приглашать участников');
    }

    return membership;
  }

  async removeMember(workspaceId: string, requestingUserId: string, targetUserId: string) {
    const currentMembership = await this.requireAdminMembership(workspaceId, requestingUserId);

    if (!targetUserId || targetUserId.trim().length === 0) {
      throw new BadRequestException('Некорректный пользователь');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: targetUserId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Участник не найден');
    }

    if (member.role === WorkspaceRole.OWNER || member.userId === workspace.ownerId) {
      throw new ForbiddenException('Нельзя удалить владельца рабочего пространства');
    }

    if (currentMembership.role === WorkspaceRole.ADMIN && member.role === WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Только владелец может управлять администраторами');
    }

    await this.workspaceMemberRepository.delete(member.id);

    if (member.user?.workspaceId === workspaceId) {
      await this.userRepository.update(member.userId, { workspaceId: null });
    }

    // Audit: record member removal from workspace.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: requestingUserId,
      entityType: EntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.UNLINK,
      meta: {
        memberId: targetUserId,
        role: member.role,
      },
    });

    return { message: 'Доступ участника отозван' };
  }

  async removeMemberLegacy(currentUser: User, targetUserId: string) {
    const workspace = await this.ensureUserWorkspace(currentUser);
    return this.removeMember(workspace.id, currentUser.id, targetUserId);
  }

  async inviteMember(
    workspaceId: string,
    currentUser: User,
    dto: InviteMemberDto,
    requestAppOrigin?: string,
  ) {
    await this.requireAdminMembership(workspaceId, currentUser.id);

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    const email = dto.email.trim().toLowerCase();
    const role = dto.role || WorkspaceRole.MEMBER;
    const permissions: WorkspaceMemberPermissions | null =
      role === WorkspaceRole.MEMBER
        ? ((dto.permissions as WorkspaceMemberPermissions | undefined) ?? null)
        : null;

    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'workspaceId'],
    });

    if (existingUser) {
      const existingMembership = await this.workspaceMemberRepository.findOne({
        where: { workspaceId, userId: existingUser.id },
      });

      if (existingMembership) {
        throw new ConflictException('Пользователь уже в рабочем пространстве');
      }
    }

    const existingInvitation = await this.invitationRepository.findOne({
      where: { workspaceId, email, status: WorkspaceInvitationStatus.PENDING },
    });

    if (existingInvitation) {
      existingInvitation.expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
      existingInvitation.role = role;
      existingInvitation.permissions = permissions;
      existingInvitation.invitedById = currentUser.id;
      existingInvitation.token = uuidv4();
      const updated = await this.invitationRepository.save(existingInvitation);
      const invitationLink = this.buildInvitationLink(updated.token, requestAppOrigin);
      await this.sendInvitationEmail({
        email,
        workspaceName: workspace.name,
        invitationLink,
        invitedBy: currentUser.name || currentUser.email,
        role,
      });

      this.eventEmitter?.emit('member.invited', {
        workspaceId,
        actorId: currentUser.id,
        actorName: currentUser.name || currentUser.email,
        invitedEmail: email,
        role,
      } satisfies MemberInvitedEvent);

      return { invitation: updated, invitationLink };
    }

    const invitation = this.invitationRepository.create({
      workspaceId,
      email,
      role,
      permissions,
      token: uuidv4(),
      status: WorkspaceInvitationStatus.PENDING,
      invitedById: currentUser.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    const savedInvitation = await this.invitationRepository.save(invitation);
    const invitationLink = this.buildInvitationLink(savedInvitation.token, requestAppOrigin);
    await this.sendInvitationEmail({
      email,
      workspaceName: workspace.name,
      invitationLink,
      invitedBy: currentUser.name || currentUser.email,
      role,
    });

    this.eventEmitter?.emit('member.invited', {
      workspaceId,
      actorId: currentUser.id,
      actorName: currentUser.name || currentUser.email,
      invitedEmail: email,
      role,
    } satisfies MemberInvitedEvent);

    return { invitation: savedInvitation, invitationLink };
  }

  async inviteMemberLegacy(currentUser: User, dto: InviteMemberDto, requestAppOrigin?: string) {
    const workspace = await this.ensureUserWorkspace(currentUser);
    return this.inviteMember(workspace.id, currentUser, dto, requestAppOrigin);
  }

  private buildInvitationLink(token: string, requestAppOrigin?: string) {
    const envOrigin = this.normalizeToOrigin(process.env.APP_URL || process.env.FRONTEND_URL);
    const requestOrigin = this.normalizeToOrigin(requestAppOrigin);

    const baseOrigin =
      (envOrigin && !this.isLocalhostOrigin(envOrigin)
        ? envOrigin
        : requestOrigin && !this.isLocalhostOrigin(requestOrigin)
          ? requestOrigin
          : envOrigin || requestOrigin) || 'http://localhost:3000';

    return `${baseOrigin.replace(/\/$/, '')}/invite/${token}`;
  }

  private normalizeToOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
      const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
      return url.origin;
    } catch {
      return null;
    }
  }

  private isLocalhostOrigin(origin: string): boolean {
    try {
      const { hostname } = new URL(origin);
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    } catch {
      return false;
    }
  }

  async getInvitationInfo(token: string) {
    const trimmedToken = token?.trim();
    if (!trimmedToken) {
      throw new BadRequestException('Некорректный токен приглашения');
    }

    const invitation = await this.invitationRepository.findOne({
      where: { token: trimmedToken },
      relations: ['workspace'],
    });

    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      if (invitation.status === WorkspaceInvitationStatus.PENDING) {
        invitation.status = WorkspaceInvitationStatus.EXPIRED;
        await this.invitationRepository.save(invitation);
      }
    }

    const workspace =
      invitation.workspace ||
      (await this.workspaceRepository.findOne({
        where: { id: invitation.workspaceId },
      }));

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    return {
      status: invitation.status,
      email: invitation.email,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(currentUser: User, token: string) {
    const trimmedToken = token?.trim();
    if (!trimmedToken) {
      throw new BadRequestException('Некорректный токен приглашения');
    }

    const invitation = await this.invitationRepository.findOne({
      where: { token: trimmedToken },
    });

    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено или уже использовано');
    }

    const currentUserEmail = currentUser.email.trim().toLowerCase();
    const expectedEmail = invitation.email.trim().toLowerCase();

    if (currentUserEmail !== expectedEmail) {
      throw new ForbiddenException(`Войдите как ${expectedEmail}`);
    }

    if (
      invitation.status === WorkspaceInvitationStatus.PENDING &&
      invitation.expiresAt &&
      invitation.expiresAt.getTime() < Date.now()
    ) {
      invitation.status = WorkspaceInvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Срок действия приглашения истёк');
    }

    if (invitation.status === WorkspaceInvitationStatus.CANCELLED) {
      throw new BadRequestException('Приглашение было отозвано');
    }

    if (
      ![WorkspaceInvitationStatus.PENDING, WorkspaceInvitationStatus.ACCEPTED].includes(
        invitation.status,
      )
    ) {
      throw new BadRequestException('Приглашение недоступно');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: invitation.workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    const existingMembership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: workspace.id, userId: currentUser.id },
    });

    let memberAdded = false;
    if (!existingMembership) {
      await this.workspaceMemberRepository.save({
        workspaceId: workspace.id,
        userId: currentUser.id,
        role: invitation.role,
        permissions: invitation.role === WorkspaceRole.MEMBER ? invitation.permissions : null,
        invitedById: invitation.invitedById,
      });
      memberAdded = true;
    }

    await this.userRepository.update(currentUser.id, { workspaceId: workspace.id });

    if (invitation.status === WorkspaceInvitationStatus.PENDING) {
      invitation.status = WorkspaceInvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      await this.invitationRepository.save(invitation);
    }

    if (memberAdded) {
      // Audit: record member linkage after accepting invitation.
      await this.auditService.createEvent({
        workspaceId: workspace.id,
        actorType: ActorType.USER,
        actorId: currentUser.id,
        entityType: EntityType.WORKSPACE,
        entityId: workspace.id,
        action: AuditAction.LINK,
        meta: {
          memberId: currentUser.id,
          role: invitation.role,
        },
      });

      this.eventEmitter?.emit('member.joined', {
        workspaceId: workspace.id,
        memberId: currentUser.id,
        memberName: currentUser.name || currentUser.email,
      } satisfies MemberJoinedEvent);
    }

    return {
      message: 'Приглашение принято. Теперь вы участник рабочего пространства.',
      workspaceId: workspace.id,
    };
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceResponseDto[]> {
    const memberships = await this.workspaceMemberRepository.find({
      where: { userId },
      relations: ['workspace'],
      order: { lastAccessedAt: 'DESC' },
    });

    const workspaces = await Promise.all(
      memberships.map(async membership => {
        const workspace = membership.workspace;
        const stats = await this.getWorkspaceStats(workspace.id);

        return {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          icon: workspace.icon,
          color: workspace.color,
          backgroundImage: workspace.backgroundImage,
          currency: workspace.currency,
          isFavorite: workspace.isFavorite,
          settings: workspace.settings,
          ownerId: workspace.ownerId,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          memberRole: membership.role,
          memberPermissions: membership.permissions,
          stats,
        };
      }),
    );

    return workspaces;
  }

  async getWorkspaceById(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceResponseDto | null> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      relations: ['workspace'],
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    const workspace = membership.workspace;
    const stats = await this.getWorkspaceStats(workspace.id);

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      icon: workspace.icon,
      color: workspace.color,
      backgroundImage: workspace.backgroundImage,
      currency: workspace.currency,
      isFavorite: workspace.isFavorite,
      settings: workspace.settings,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      memberRole: membership.role,
      memberPermissions: membership.permissions,
      stats,
    };
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    const workspace = this.workspaceRepository.create({
      name: dto.name,
      description: dto.description || null,
      icon: dto.icon || null,
      color: dto.color || null,
      backgroundImage: dto.backgroundImage || null,
      currency: dto.currency || null,
      ownerId: userId,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    await this.workspaceMemberRepository.save({
      workspaceId: savedWorkspace.id,
      userId,
      role: WorkspaceRole.OWNER,
      invitedById: userId,
      lastAccessedAt: new Date(),
      accessCount: 1,
    });

    await this.userRepository.update(userId, { lastWorkspaceId: savedWorkspace.id });
    await this.categoriesService.createSystemCategories(savedWorkspace.id, userId);
    await this.balanceService.seedDefaultAccounts(savedWorkspace.id);

    const stats = await this.getWorkspaceStats(savedWorkspace.id);

    // Audit: record workspace creation.
    await this.auditService.createEvent({
      workspaceId: savedWorkspace.id,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.WORKSPACE,
      entityId: savedWorkspace.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: savedWorkspace },
    });

    return {
      id: savedWorkspace.id,
      name: savedWorkspace.name,
      description: savedWorkspace.description,
      icon: savedWorkspace.icon,
      color: savedWorkspace.color,
      backgroundImage: savedWorkspace.backgroundImage,
      currency: savedWorkspace.currency,
      isFavorite: savedWorkspace.isFavorite,
      settings: savedWorkspace.settings,
      ownerId: savedWorkspace.ownerId,
      createdAt: savedWorkspace.createdAt,
      updatedAt: savedWorkspace.updatedAt,
      memberRole: WorkspaceRole.OWNER,
      memberPermissions: null,
      stats,
    };
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    if (![WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(membership.role)) {
      throw new ForbiddenException('Только владелец или администратор может изменять настройки');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    const before = { ...workspace };
    const changedFields = Object.keys(dto).filter(
      key => (dto as Record<string, unknown>)[key] !== undefined,
    );
    Object.assign(workspace, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.backgroundImage !== undefined && { backgroundImage: dto.backgroundImage }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
    });

    const updated = await this.workspaceRepository.save(workspace);
    const stats = await this.getWorkspaceStats(updated.id);

    // Audit: record workspace updates for traceability and rollback.
    await this.auditService.createEvent({
      workspaceId: updated.id,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.WORKSPACE,
      entityId: updated.id,
      action: AuditAction.UPDATE,
      diff: { before, after: updated },
      isUndoable: true,
    });

    this.eventEmitter?.emit('workspace.updated', {
      workspaceId: updated.id,
      actorId: userId,
      actorName: await this.resolveActorName(userId),
      changedFields,
    } satisfies WorkspaceUpdatedEvent);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      color: updated.color,
      backgroundImage: updated.backgroundImage,
      currency: updated.currency,
      isFavorite: updated.isFavorite,
      settings: updated.settings,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      memberRole: membership.role,
      memberPermissions: membership.permissions,
      stats,
    };
  }

  async switchWorkspace(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    await this.userRepository.update(userId, { lastWorkspaceId: workspaceId });

    await this.workspaceMemberRepository.update(membership.id, {
      lastAccessedAt: new Date(),
      accessCount: membership.accessCount + 1,
    });
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Только владелец может удалить рабочее пространство');
    }

    await this.workspaceRepository.remove(workspace);

    // Audit: record workspace deletion for rollback.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.DELETE,
      diff: { before: workspace, after: null },
      isUndoable: true,
    });
  }

  async toggleFavorite(workspaceId: string, userId: string): Promise<{ isFavorite: boolean }> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Вы не состоите в этом рабочем пространстве');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее пространство не найдено');
    }

    workspace.isFavorite = !workspace.isFavorite;
    const updated = await this.workspaceRepository.save(workspace);

    return { isFavorite: updated.isFavorite };
  }

  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStatsDto> {
    const integrationCount = await this.integrationRepository.count({
      where: { workspaceId: workspaceId },
    });

    const memberCount = await this.workspaceMemberRepository.count({
      where: { workspaceId },
    });

    const recentMembership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId },
      order: { lastAccessedAt: 'DESC' },
    });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivity =
      recentMembership?.lastAccessedAt && recentMembership.lastAccessedAt > twentyFourHoursAgo;

    return {
      integrationCount,
      memberCount,
      recentActivity: !!recentActivity,
      lastAccessedAt: recentMembership?.lastAccessedAt || null,
    };
  }

  private async sendInvitationEmail(params: {
    email: string;
    workspaceName: string;
    invitationLink: string;
    invitedBy?: string | null;
    role?: WorkspaceRole | null;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM;

    if (!resendApiKey || !resendFrom) {
      console.warn(
        `[Workspaces] Resend не настроен (нужны RESEND_API_KEY и RESEND_FROM), ссылка приглашения для ${params.email}: ${params.invitationLink}`,
      );
      return;
    }

    const { WorkspaceInvitationEmail, workspaceInvitationEmailText } = await import(
      '../../emails/workspace-invitation.email'
    );

    const roleLabels: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      member: 'Участник',
    };

    const emailReact = React.createElement(WorkspaceInvitationEmail, {
      workspaceName: params.workspaceName,
      invitationLink: params.invitationLink,
      invitedBy: params.invitedBy,
      roleLabel: params.role ? roleLabels[params.role] || params.role : null,
    });

    const resend = new Resend(resendApiKey);

    try {
      const html = await render(emailReact);
      const timeoutMs = Number.parseInt(process.env.RESEND_TIMEOUT_MS || '10000', 10);

      const { error } = await retry(
        () =>
          withTimeout(
            resend.emails.send({
              from: resendFrom,
              to: params.email,
              subject: `Приглашение в рабочее пространство ${params.workspaceName}`,
              html,
              text: workspaceInvitationEmailText({
                workspaceName: params.workspaceName,
                invitationLink: params.invitationLink,
                invitedBy: params.invitedBy,
                roleLabel: params.role ? roleLabels[params.role] || params.role : null,
              }),
              replyTo: process.env.RESEND_REPLY_TO || undefined,
            }),
            Number.isFinite(timeoutMs) ? timeoutMs : 10000,
            'Resend request timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
          isRetryable: err => err instanceof TimeoutError,
        },
      );

      if (error) {
        console.warn(
          '[Workspaces] Не удалось отправить email приглашения через Resend:',
          error.message,
        );
      }
    } catch (error) {
      console.warn(
        '[Workspaces] Не удалось отправить email приглашения через Resend:',
        (error as Error)?.message,
      );
    }
  }
}
