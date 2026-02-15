import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  Put,
  Query,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { type User, UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import type {
  AddPermissionDto,
  RemovePermissionDto,
  UpdatePermissionsDto,
} from './dto/update-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionsService } from './services/permissions.service';
import { UsersService } from './users.service';
import { sanitizeAvatarFilename } from '../../common/utils/avatar-filename.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import { TimezonesService } from '../../common/services/timezones.service';
import type { Response } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly timezonesService: TimezonesService,
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_VIEW_ALL)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, currentUser);
    return { message: 'User deleted successfully' };
  }

  @Get(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
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
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
  async updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    const user = await this.permissionsService.updateUserPermissions(id, dto.permissions);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permissions updated successfully',
    };
  }

  @Post(':id/permissions/add')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
  async addPermission(@Param('id') id: string, @Body() dto: AddPermissionDto) {
    const user = await this.permissionsService.addPermission(id, dto.permission);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission added successfully',
    };
  }

  @Post(':id/permissions/remove')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
  async removePermission(@Param('id') id: string, @Body() dto: RemovePermissionDto) {
    const user = await this.permissionsService.removePermission(id, dto.permission);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission removed successfully',
    };
  }

  @Post(':id/permissions/reset')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.USER_MANAGE)
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
    const { passwordHash, ...safeUser } = updatedUser as any;
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
    const { passwordHash, ...safeUser } = updatedUser as any;
    return { user: safeUser, avatarUrl: url };
  }
}
