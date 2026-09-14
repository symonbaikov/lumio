import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { diskStorage } from 'multer';
import * as path from 'path';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { appError } from '../../common/errors/app-error';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimezonesService } from '../../common/services/timezones.service';
import {
  isAllowedAvatarMime,
  resolveAvatarContentType,
  sanitizeAvatarFilename,
} from '../../common/utils/avatar-filename.util';
import { validateImageSignature } from '../../common/utils/file-validator.util';
import { deletedResponse } from '../../common/utils/responses.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import { type User, UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CURRENT_DISCLAIMER_VERSION } from './disclaimer.constant';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { DeleteMyAccountDto } from './dto/delete-my-account.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
// Value import, not `import type`: a type-only import erases the DTO class, so
// the global ValidationPipe sees an `Object` metatype and validates nothing —
// arbitrary strings then reach the users.permissions column.
import {
  AddPermissionDto,
  RemovePermissionDto,
  UpdatePermissionsDto,
} from './dto/update-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccountDataService } from './services/account-data.service';
import { PermissionsService } from './services/permissions.service';
import { UsersService } from './users.service';
import { EmailChangeService } from './services/email-change.service';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';

// Aliased rather than written inline: `emitDecoratorMetadata` turns a
// decorated parameter's type into a runtime reference, and the global
// `Express` namespace has no runtime value. A type alias is erased.
type MulterFile = Express.Multer.File;

const CONTENT_BACKGROUNDS_DIR = 'user-backgrounds';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly emailChangeService: EmailChangeService,
    private readonly timezonesService: TimezonesService,
    private readonly accountDataService: AccountDataService,
  ) {}

  private toSafeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @Get()
  @WorkspaceAuth(Permission.USER_VIEW_ALL)
  async findAll(@WorkspaceId() workspaceId: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(workspaceId, limit ? Number.parseInt(limit) : 20);
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

  @Get('me/export')
  async exportMyData(@CurrentUser() currentUser: User) {
    return this.accountDataService.exportMyData(currentUser.id);
  }

  @Delete('me')
  async deleteMyAccount(@CurrentUser() currentUser: User, @Body() dto: DeleteMyAccountDto) {
    await this.accountDataService.deleteMyAccount(currentUser.id, dto.currentPassword);
    return deletedResponse('Account');
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

    // Pin the Content-Type to the image type the extension maps to instead of
    // letting sendFile infer it: an inferred text/html here would execute on
    // this origin. Unknown extensions predate the allowlist above — serve them
    // as an opaque download rather than guessing a type for them.
    const contentType = resolveAvatarContentType(safeFileName);

    return res.sendFile(filePath, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Type': contentType ?? 'application/octet-stream',
        ...(contentType ? {} : { 'Content-Disposition': 'attachment' }),
      },
    });
  }

  // Public like avatars: the image is loaded by a plain <img>, which carries no
  // auth header. Upload names are random, so a file cannot be guessed.
  @Public()
  @Get('backgrounds/:fileName')
  getContentBackground(@Param('fileName') fileName: string, @Res() res: Response) {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(resolveUploadsDir(), CONTENT_BACKGROUNDS_DIR, safeFileName);
    // Every stored name carries an allowlisted image extension; anything else
    // was never written by the upload route.
    const contentType = resolveAvatarContentType(safeFileName);

    if (!(contentType && fs.existsSync(filePath))) {
      return res.status(404).send('Background not found');
    }

    return res.sendFile(filePath, {
      headers: {
        // A name is never reused, so the file can be cached for good.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Type': contentType,
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
  async getUserPermissions(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const user = await this.permissionsService.findUserInWorkspace(id, workspaceId);
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
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
    @CurrentUser() currentUser: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const user = await this.permissionsService.updateUserPermissions(
      id,
      dto.permissions,
      currentUser,
      workspaceId,
    );
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permissions updated successfully',
    };
  }

  @Post(':id/permissions/add')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async addPermission(
    @Param('id') id: string,
    @Body() dto: AddPermissionDto,
    @CurrentUser() currentUser: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const user = await this.permissionsService.addPermission(
      id,
      dto.permission,
      currentUser,
      workspaceId,
    );
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission added successfully',
    };
  }

  @Post(':id/permissions/remove')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async removePermission(
    @Param('id') id: string,
    @Body() dto: RemovePermissionDto,
    @WorkspaceId() workspaceId: string,
  ) {
    const user = await this.permissionsService.removePermission(id, dto.permission, workspaceId);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permission removed successfully',
    };
  }

  @Post(':id/permissions/reset')
  @WorkspaceAuth(Permission.USER_MANAGE)
  async resetPermissions(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const user = await this.permissionsService.resetPermissions(id, workspaceId);
    return {
      userId: id,
      permissions: user.permissions,
      message: 'Permissions reset to role defaults',
    };
  }

  // Both of these bcrypt-verify the current password, which makes them an
  // online guessing oracle for anyone holding a stolen session.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('me/email')
  async changeEmail(@CurrentUser() currentUser: User, @Body() dto: ChangeEmailDto) {
    await this.usersService.requestEmailChange(currentUser.id, dto);

    // The address does not change until the link lands; say so rather than
    // reporting a success that has not happened yet.
    return {
      message: `Confirm the change from the link we sent to ${dto.email}.`,
    };
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('me/email/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(@Body() dto: ConfirmEmailChangeDto) {
    const { email } = await this.emailChangeService.confirmEmailChange(dto.token);
    return { email, message: 'Email address confirmed.' };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('me/content-background')
  @UseInterceptors(
    FileInterceptor('background', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = path.join(resolveUploadsDir(), CONTENT_BACKGROUNDS_DIR);
          fs.mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          try {
            // The extension comes from the allowlisted MIME type, never the client name.
            const extension = path.extname(sanitizeAvatarFilename('background', file.mimetype));
            cb(null, `${randomUUID()}${extension}`);
          } catch {
            cb(new BadRequestException('Unsupported image type'), '');
          }
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!isAllowedAvatarMime(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPEG, PNG, WebP and GIF images are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10_000_000 },
    }),
  )
  async uploadMyContentBackground(
    @CurrentUser() currentUser: User,
    @UploadedFile() file: MulterFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(appError('FILE_NOT_UPLOADED'));
    }

    // Confirm the bytes match the declared type before the public route serves them.
    try {
      validateImageSignature(file);
    } catch (error) {
      await fsp.unlink(file.path).catch(() => undefined);
      throw error;
    }

    const contentBackground = `/api/v1/users/backgrounds/${encodeURIComponent(file.filename)}`;
    await this.usersService.updateMyContentBackground(currentUser.id, contentBackground);
    return { contentBackground };
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
          try {
            cb(null, sanitizeAvatarFilename(file.originalname, file.mimetype));
          } catch {
            // Unreachable while fileFilter runs first, but the filename callback
            // must not surface an unsupported type as a 500.
            cb(new BadRequestException('Unsupported avatar type'), '');
          }
        },
      }),
      fileFilter: (_req, file, cb) => {
        // Allowlist, not `startsWith('image/')`: the declared type decides the
        // stored extension, so anything outside this set must be rejected here.
        if (!isAllowedAvatarMime(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPEG, PNG, WebP and GIF images are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 2_000_000 },
    }),
  )
  async uploadMyAvatar(
    @CurrentUser() currentUser: User,
    @UploadedFile() file: MulterFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(appError('FILE_NOT_UPLOADED'));
    }

    // The declared MIME type picked the extension; confirm the bytes agree
    // before the file becomes reachable through the public avatar route.
    try {
      validateImageSignature(file);
    } catch (error) {
      await fsp.unlink(file.path).catch(() => undefined);
      throw error;
    }

    const url = `/api/v1/users/avatars/${encodeURIComponent(file.filename)}`;
    const updatedUser = await this.usersService.updateMyAvatar(currentUser.id, url);
    const safeUser = this.toSafeUser(updatedUser);
    return { user: safeUser, avatarUrl: url };
  }
}
