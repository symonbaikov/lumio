import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimezonesService } from '../../common/services/timezones.service';
import { sanitizeAvatarFilename } from '../../common/utils/avatar-filename.util';
import { deletedResponse } from '../../common/utils/responses.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import { type User, UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CURRENT_DISCLAIMER_VERSION } from './disclaimer.constant';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import type {
  AddPermissionDto,
  RemovePermissionDto,
  UpdatePermissionsDto,
} from './dto/update-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionsService } from './services/permissions.service';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly timezonesService: TimezonesService,
  ) {}

  private toSafeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @Get()
  @WorkspaceAuth(Permission.USER_VIEW_ALL)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(
      page ? Number.parseInt(page) : 1,
      limit ? Number.parseInt(limit) : 20,
    );
  }

  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.getProfile(user.id);
  }

  @Get('timezones')
  async getTimeZones() {
    return { timeZones: this.timezonesService.listTimeZones() };
  }

  @Patch('me/onboarding')
  async completeOnboarding(@CurrentUser() currentUser: User, @Body() dto: CompleteOnboardingDto) {
    const updatedUser = await this.usersService.completeOnboarding(currentUser.id, dto);
    const safeUser = this.toSafeUser(updatedUser);
    return { user: safeUser, message: 'Onboarding completed successfully' };
  }

  /**
   * The disclaimer text itself lives in the client bundle so it can be shown in
   * the user's language; this endpoint owns the record of what was accepted and
   * when, which is the part that has to be auditable.
   */
  @Post('me/disclaimer')
  async acceptDisclaimer(@CurrentUser() currentUser: User) {
    const updatedUser = await this.usersService.acceptDisclaimer(currentUser.id);
    return {
      user: this.toSafeUser(updatedUser),
      version: CURRENT_DISCLAIMER_VERSION,
    };
  }

  @Get('me/disclaimer')
  async getDisclaimerStatus(@CurrentUser() currentUser: User) {
    const user = await this.usersService.getProfile(currentUser.id);
    return {
      version: CURRENT_DISCLAIMER_VERSION,
      acceptedAt: user.disclaimerAcceptedAt,
      acceptedVersion: user.disclaimerVersion,
      // Computed here rather than in the client so that bumping the version
      // re-prompts everyone without shipping a frontend release.
      accepted: user.disclaimerVersion === CURRENT_DISCLAIMER_VERSION,
    };
  }

  @Public()
  @Get('avatars/:fileName')
  getAvatar(@Param('fileName') fileName: string, @Res() res: Response) {
    const uploadsDir = resolveUploadsDir();
    const safeFileName = path.basename(fileName);
    const filePath = path.join(uploadsDir, 'user-avatars', safeFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Avatar not found');
    }

    return res.sendFile(filePath, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User): Promise<User> {
    // Users can only view their own profile unless they're admin
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      return this.usersService.getProfile(currentUser.id);
    }

    return this.usersService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, currentUser);
    return deletedResponse('User');
  }

  @Get(':id/permissions')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async getUserPermissions(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    const permissions = this.permissionsService.getUserPermissions(user);
    return {
      userId: id,
      role: user.role,
      customPermissions: user.permissions || [],
      allPermissions: permissions,
    };
  }

  @Put(':id/permissions')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    const user = await this.permissionsService.updateUserPermissions(id, dto.permissions);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permissions updated successfully',
    };
  }

  @Post(':id/permissions/add')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async addPermission(@Param('id') id: string, @Body() dto: AddPermissionDto) {
    const user = await this.permissionsService.addPermission(id, dto.permission);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission added successfully',
    };
  }

  @Post(':id/permissions/remove')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async removePermission(@Param('id') id: string, @Body() dto: RemovePermissionDto) {
    const user = await this.permissionsService.removePermission(id, dto.permission);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission removed successfully',
    };
  }

  @Post(':id/permissions/reset')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async resetPermissions(@Param('id') id: string) {
    const user = await this.permissionsService.resetPermissions(id);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permissions reset to role defaults',
    };
  }

  @Patch('me/email')
  async changeEmail(@CurrentUser() currentUser: User, @Body() dto: ChangeEmailDto) {
    const updatedUser = await this.usersService.changeEmail(currentUser.id, dto);

    const { passwordHash, ...safeUser } = updatedUser;

    return {
      user: safeUser,
      message: 'Email updated successfully',
    };
  }

  @Patch('me/password')
  async changePassword(@CurrentUser() currentUser: User, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(currentUser.id, dto);
    return { message: 'Password updated successfully' };
  }

  @Patch('me/preferences')
  async updateMyPreferences(@CurrentUser() currentUser: User, @Body() dto: UpdateMyPreferencesDto) {
    const updatedUser = await this.usersService.updateMyPreferences(currentUser.id, dto);
    const safeUser = this.toSafeUser(updatedUser);
    return { user: safeUser, message: 'Profile updated successfully' };
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadsDir = resolveUploadsDir();
          const targetDir = path.join(uploadsDir, 'user-avatars');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          const safeName = sanitizeAvatarFilename(file.originalname);
          cb(null, safeName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only images allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2_000_000 },
    }),
  )
  async uploadMyAvatar(
    @CurrentUser() currentUser: User,
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const url = `/api/v1/users/avatars/${encodeURIComponent(file.filename)}`;
    const updatedUser = await this.usersService.updateMyAvatar(currentUser.id, url);
    const safeUser = this.toSafeUser(updatedUser);
    return { user: safeUser, avatarUrl: url };
  }
}
