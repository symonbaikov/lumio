import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Permission, ROLE_PERMISSIONS } from '../../../common/enums/permissions.enum';
import { User, UserRole } from '../../../entities/user.entity';
import { findUserOrThrow, getCurrentPermissions, withCurrentPermissions } from './permissions.util';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get all permissions for a user (custom + role-based)
   */
  getUserPermissions(user: User): Permission[] {
    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return Object.values(Permission);
    }

    // If user has custom permissions, merge with role-based
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const customPermissions = getCurrentPermissions(user);

    // Merge and deduplicate
    return [...new Set([...rolePermissions, ...customPermissions])];
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    return this.getUserPermissions(user).includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId: string, permissions: Permission[]): Promise<User> {
    const user = await findUserOrThrow(this.userRepository.findOne({ where: { id: userId } }));

    user.permissions = permissions;
    return this.userRepository.save(user);
  }

  /**
   * Add permission to user
   */
  async addPermission(userId: string, permission: Permission): Promise<User> {
    const user = await findUserOrThrow(this.userRepository.findOne({ where: { id: userId } }));

    return withCurrentPermissions(user, async (loadedUser, currentPermissions) => {
      if (!currentPermissions.includes(permission)) {
        loadedUser.permissions = [...currentPermissions, permission];
        return this.userRepository.save(loadedUser);
      }

      return loadedUser;
    });
  }

  /**
   * Remove permission from user
   */
  async removePermission(userId: string, permission: Permission): Promise<User> {
    const user = await findUserOrThrow(this.userRepository.findOne({ where: { id: userId } }));

    return withCurrentPermissions(user, (loadedUser, currentPermissions) => {
      loadedUser.permissions = currentPermissions.filter(p => p !== permission);
      return this.userRepository.save(loadedUser);
    });
  }

  /**
   * Reset user permissions to role defaults
   */
  async resetPermissions(userId: string): Promise<User> {
    const user = await findUserOrThrow(this.userRepository.findOne({ where: { id: userId } }));

    user.permissions = null;
    return this.userRepository.save(user);
  }
}
