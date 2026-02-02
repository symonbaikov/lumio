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
import { User, UserRole } from '../../entities/user.entity';
import type { ChangeEmailDto } from './dto/change-email.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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
        'tokenVersion',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(workspaceId?: string | number, limit = 20): Promise<User[]> {
    const where: any = { deletedAt: null };
    if (workspaceId !== undefined && workspaceId !== null) {
      where.workspaceId = String(workspaceId);
    }

    return this.userRepository.find({
      where,
      take: limit,
      order: { createdAt: 'DESC' },
    });
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

  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<User> {
    const user = await this.findOneWithPassword(userId);

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    if (dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    user.email = dto.email;
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOneWithPassword(userId);

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
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

    return this.userRepository.save(user);
  }

  async updateMyAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.findOneWithPassword(userId);
    user.avatarUrl = avatarUrl;
    return this.userRepository.save(user);
  }
}
