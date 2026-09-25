import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { Permission } from '../../common/enums/permissions.enum';
import { hashPassword } from '../../common/utils/password-hash.util';
import { User, UserRole } from '../../entities/user.entity';
import { Workspace } from '../../entities/workspace.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CURRENT_DISCLAIMER_VERSION } from './disclaimer.constant';
import type { ChangeEmailDto } from './dto/change-email.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import type { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { EmailChangeService } from './services/email-change.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private readonly workspacesService: WorkspacesService,
    private readonly emailChangeService: EmailChangeService,
  ) {}

  private getUserFindAllOptions(workspaceId: string, limit = 20) {
    return {
      where: { deletedAt: null, workspaceId } as const,
      take: limit,
      order: { createdAt: 'DESC' as const },
    };
  }

  private async findOneWithPassword(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'passwordHash',
        'name',
        'company',
        'role',
        'workspaceId',
        'googleId',
        'telegramId',
        'telegramChatId',
        'createdAt',
        'updatedAt',
        'lastLogin',
        'isActive',
        'permissions',
        'locale',
        'timeZone',
        'themePreference',
        'mapStylePreference',
        'avatarUrl',
        'onboardingCompletedAt',
        'disclaimerAcceptedAt',
        'disclaimerVersion',
        'welcomeTutorialSeenAt',
        'tokenVersion',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // workspaceId is required, not optional: as an optional parameter the tenant
  // filter silently disappeared whenever a caller passed the wrong argument,
  // which is exactly what the controller used to do (it passed the page number).
  async findAll(workspaceId: string, limit = 20): Promise<User[]> {
    if (typeof this.userRepository.createQueryBuilder === 'function') {
      return this.userRepository
        .createQueryBuilder('user')
        .where('user.deletedAt IS NULL')
        .andWhere('user.workspaceId = :workspaceId', { workspaceId })
        .orderBy('user.createdAt', 'DESC')
        .take(limit)
        .getMany();
    }

    return this.userRepository.find(this.getUserFindAllOptions(workspaceId, limit));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'name',
        'company',
        'role',
        'workspaceId',
        'googleId',
        'telegramId',
        'telegramChatId',
        'createdAt',
        'updatedAt',
        'lastLogin',
        'isActive',
        'permissions',
        'locale',
        'timeZone',
        'themePreference',
        'mapStylePreference',
        'onboardingCompletedAt',
        'disclaimerAcceptedAt',
        'disclaimerVersion',
        'welcomeTutorialSeenAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    // Only admins can update users
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.findOne(id);

    // Check email uniqueness if email is being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Only admins can change roles
    if (updateUserDto.role && currentUser.role !== UserRole.ADMIN) {
      updateUserDto.role = undefined;
    }

    // Only admins can change permissions
    if (updateUserDto.permissions && currentUser.role !== UserRole.ADMIN) {
      updateUserDto.permissions = undefined;
    }

    // Validate permissions if provided
    if (updateUserDto.permissions) {
      const validPermissions = Object.values(Permission);
      const invalidPermissions = updateUserDto.permissions.filter(
        p => !validPermissions.includes(p as Permission),
      );
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    // Only admins can delete users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Prevent self-deletion
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    await this.findOne(id);
    await this.userRepository.softDelete(id);
  }

  async getProfile(userId: string): Promise<User> {
    return this.findOne(userId);
  }

  /**
   * Records that the user accepted the current no-warranty disclaimer.
   *
   * Accepting the same revision twice keeps the original timestamp: the first
   * acceptance is the one that carries meaning, and overwriting it would erase
   * when consent was actually given.
   */
  async acceptDisclaimer(userId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (user.disclaimerVersion === CURRENT_DISCLAIMER_VERSION && user.disclaimerAcceptedAt) {
      return user;
    }

    user.disclaimerAcceptedAt = new Date();
    user.disclaimerVersion = CURRENT_DISCLAIMER_VERSION;

    return this.userRepository.save(user);
  }

  /**
   * Stops the welcome tutorial from opening by itself. A single conditional UPDATE:
   * the first close wins even when several arrive at once (two tabs), and no other
   * column of the user is read back and rewritten.
   */
  async markWelcomeTutorialSeen(userId: string): Promise<Date | null> {
    await this.userRepository.query(
      'UPDATE "users" SET "welcome_tutorial_seen_at" = NOW() WHERE "id" = $1 AND "welcome_tutorial_seen_at" IS NULL',
      [userId],
    );
    const { welcomeTutorialSeenAt } = await this.findOne(userId);
    return welcomeTutorialSeenAt;
  }

  /**
   * Confirms the caller owns the account, then hands off to EmailChangeService,
   * which mails a confirmation link to the new address. The account keeps its
   * current email until that link is opened.
   */
  async requestEmailChange(userId: string, dto: ChangeEmailDto): Promise<void> {
    const user = await this.findOneWithPassword(userId);

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    await this.emailChangeService.requestEmailChange(user, dto.email);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOneWithPassword(userId);

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(dto.newPassword);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);
  }

  async updateMyPreferences(userId: string, dto: UpdateMyPreferencesDto): Promise<User> {
    const user = await this.findOneWithPassword(userId);

    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }
    if (dto.locale !== undefined) {
      user.locale = dto.locale;
    }
    if (dto.timeZone !== undefined) {
      const tz = dto.timeZone;
      user.timeZone = tz === null ? null : String(tz).trim() || null;
    }
    if (dto.themePreference !== undefined) {
      user.themePreference = dto.themePreference;
    }
    if (dto.mapStylePreference !== undefined) {
      const style = dto.mapStylePreference;
      user.mapStylePreference = style === null ? null : String(style).trim() || null;
    }
    if (dto.dateFormat !== undefined) {
      user.dateFormat = dto.dateFormat;
    }
    if (dto.firstDayOfWeek !== undefined) {
      user.firstDayOfWeek = dto.firstDayOfWeek;
    }
    if (dto.uiDensity !== undefined) {
      user.uiDensity = dto.uiDensity;
    }
    if (dto.reduceMotion !== undefined) {
      user.reduceMotion = dto.reduceMotion;
    }

    return this.userRepository.save(user);
  }

  async updateMyAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.findOneWithPassword(userId);
    user.avatarUrl = avatarUrl;
    return this.userRepository.save(user);
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto): Promise<User> {
    const user = await this.findOneWithPassword(userId);

    if (!user.workspaceId) {
      const ensuredWorkspace = await this.workspacesService.ensureUserWorkspace(user);
      user.workspaceId = ensuredWorkspace.id;
    }

    if (dto.locale !== undefined) {
      user.locale = dto.locale;
    }

    if (dto.timeZone !== undefined) {
      user.timeZone = dto.timeZone === null ? null : String(dto.timeZone).trim() || null;
    }

    const shouldUpdateWorkspace =
      Boolean(user.workspaceId) &&
      (dto.workspaceName !== undefined ||
        dto.workspaceCurrency !== undefined ||
        dto.workspaceBackgroundImage !== undefined);

    if (shouldUpdateWorkspace) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: user.workspaceId as string },
      });

      if (workspace) {
        if (dto.workspaceName !== undefined) {
          const workspaceName = dto.workspaceName.trim();
          if (workspaceName.length > 0) {
            workspace.name = workspaceName;
          }
        }

        if (dto.workspaceCurrency !== undefined) {
          const workspaceCurrency = dto.workspaceCurrency.trim().toUpperCase();
          workspace.currency = workspaceCurrency.length > 0 ? workspaceCurrency : null;
        }

        if (dto.workspaceBackgroundImage !== undefined) {
          const workspaceBackgroundImage = dto.workspaceBackgroundImage.trim();
          workspace.backgroundImage =
            workspaceBackgroundImage.length > 0 ? workspaceBackgroundImage : null;
        }

        await this.workspaceRepository.save(workspace);
      }
    }

    if (!user.onboardingCompletedAt) {
      user.onboardingCompletedAt = new Date();
    }

    return this.userRepository.save(user);
  }
}
