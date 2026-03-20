import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConnectPickerSheetDto } from './dto/connect-picker-sheet.dto';
import { ConnectSheetDto } from './dto/connect-sheet.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('google-sheets')
@UseGuards(JwtAuthGuard)
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  private toPublicSheet(sheet: any) {
    const refreshToken = typeof sheet.refreshToken === 'string' ? sheet.refreshToken : '';
    return {
      id: sheet.id,
      sheetId: sheet.sheetId,
      sheetName: sheet.sheetName,
      worksheetName: sheet.worksheetName,
      isActive: sheet.isActive,
      oauthConnected: Boolean(refreshToken && !refreshToken.includes('placeholder')),
      lastSync: sheet.lastSync,
      createdAt: sheet.createdAt,
      updatedAt: sheet.updatedAt,
    };
  }

  @Get('oauth/url')
  async getAuthUrl(@Query('state') state?: string) {
    return { url: this.googleSheetsService.getAuthUrl(state) };
  }

  @Get('oauth/status')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getAuthStatus(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.googleSheetsService.getAuthStatus(user, workspaceId);
  }

  @Get('picker-token')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getPickerToken(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.googleSheetsService.getPickerToken(user, workspaceId);
  }

  @Post('oauth/callback')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async oauthCallback(
    @Body() body: OAuthCallbackDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    if (!body.sheetId) {
      const auth = await this.googleSheetsService.connectOAuthSession(user, workspaceId, body.code);
      return { message: 'Google account connected', auth };
    }

    const sheet = await this.googleSheetsService.connectWithOAuthCode(
      user,
      workspaceId,
      body.code,
      body.sheetId,
      body.worksheetName,
      body.sheetName,
    );
    return { message: 'Google Sheet connected', sheet: this.toPublicSheet(sheet) };
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async connect(
    @Body() connectDto: ConnectSheetDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    throw new BadRequestException(
      'Подключение через этот endpoint больше не поддерживается. Используйте OAuth: GET /google-sheets/oauth/url → POST /google-sheets/oauth/callback',
    );
  }

  @Get('spreadsheets/:spreadsheetId/worksheets')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listWorksheets(
    @Param('spreadsheetId') spreadsheetId: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.googleSheetsService.listWorksheets(user, workspaceId, spreadsheetId);
  }

  @Post('connect-with-picker')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async connectWithPicker(
    @Body() body: ConnectPickerSheetDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const sheet = await this.googleSheetsService.createConnectionFromPicker(
      user,
      workspaceId,
      body,
    );
    return { message: 'Google Sheet connected', sheet: this.toPublicSheet(sheet) };
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async findAll(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    const sheets = await this.googleSheetsService.findAll(workspaceId);
    return sheets.map(sheet => this.toPublicSheet(sheet));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const sheet = await this.googleSheetsService.findOne(id, workspaceId);
    return this.toPublicSheet(sheet);
  }

  @Put(':id/sync')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async sync(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() body?: { statementId?: string },
  ) {
    const result = await this.googleSheetsService.syncTransactions(
      id,
      workspaceId,
      body?.statementId,
    );
    return {
      message: `Successfully synced ${result.synced} transactions`,
      lastSync: result.sheet.lastSync,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.googleSheetsService.remove(id, workspaceId);
    return { message: 'Google Sheet disconnected successfully' };
  }
}
