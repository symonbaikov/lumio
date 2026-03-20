import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';
import { Category } from '../../entities/category.entity';
import { GoogleSheet } from '../../entities/google-sheet.entity';
import { GoogleSheetsCredential } from '../../entities/google-sheets-credential.entity';
import { Transaction } from '../../entities/transaction.entity';
import type { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import type { ConnectPickerSheetDto } from './dto/connect-picker-sheet.dto';
import type { ConnectSheetDto } from './dto/connect-sheet.dto';
import { GoogleSheetsApiService } from './services/google-sheets-api.service';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(
    @InjectRepository(GoogleSheet)
    private googleSheetRepository: Repository<GoogleSheet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(GoogleSheetsCredential)
    private googleSheetsCredentialRepository: Repository<GoogleSheetsCredential>,
    private configService: ConfigService,
    private googleSheetsApiService: GoogleSheetsApiService,
  ) {}

  private async findCredential(userId: string, workspaceId: string) {
    return this.googleSheetsCredentialRepository.findOne({
      where: { userId, workspaceId },
    });
  }

  private async upsertCredential(
    userId: string,
    workspaceId: string,
    payload: {
      accessToken: string;
      refreshToken: string;
      email?: string | null;
    },
  ) {
    const existing = await this.findCredential(userId, workspaceId);
    const credential = this.googleSheetsCredentialRepository.create({
      ...(existing || {}),
      userId,
      workspaceId,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      email: payload.email ?? existing?.email ?? null,
    });

    return this.googleSheetsCredentialRepository.save(credential);
  }

  async getAuthStatus(user: User, workspaceId: string) {
    const credential = await this.findCredential(user.id, workspaceId);
    return {
      connected: Boolean(credential?.refreshToken),
      email: credential?.email || null,
    };
  }

  async connectOAuthSession(user: User, workspaceId: string, code: string) {
    const { accessToken, refreshToken } =
      await this.googleSheetsApiService.exchangeCodeForTokens(code);
    const existing = await this.findCredential(user.id, workspaceId);
    const resolvedRefreshToken = refreshToken || existing?.refreshToken || '';

    if (!resolvedRefreshToken) {
      throw new BadRequestException(
        'Google OAuth did not return a refresh token. Please retry consent.',
      );
    }

    const profile = await this.googleSheetsApiService.getUserInfo(accessToken);
    await this.upsertCredential(user.id, workspaceId, {
      accessToken,
      refreshToken: resolvedRefreshToken,
      email: profile.email,
    });

    return {
      connected: true,
      email: profile.email,
    };
  }

  async listWorksheets(user: User, workspaceId: string, spreadsheetId: string) {
    const credential = await this.findCredential(user.id, workspaceId);

    if (!credential?.refreshToken) {
      throw new BadRequestException('Google account is not connected.');
    }

    let accessToken = credential.accessToken;
    const hasAccess = await this.googleSheetsApiService.verifyAccess(
      accessToken,
      credential.refreshToken,
      spreadsheetId,
    );

    if (!hasAccess) {
      accessToken = await this.googleSheetsApiService.refreshAccessToken(credential.refreshToken);
      credential.accessToken = accessToken;
      await this.googleSheetsCredentialRepository.save(credential);
    }

    return this.googleSheetsApiService.listWorksheets(accessToken, spreadsheetId);
  }

  async getPickerToken(user: User, workspaceId: string) {
    const credential = await this.findCredential(user.id, workspaceId);
    const apiKey =
      this.configService.get<string>('NEXT_PUBLIC_GOOGLE_API_KEY') ||
      this.configService.get<string>('NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY') ||
      '';

    if (!credential?.refreshToken) {
      throw new BadRequestException('Google account is not connected.');
    }

    if (credential.accessToken) {
      return { accessToken: credential.accessToken, apiKey };
    }

    const accessToken = await this.googleSheetsApiService.refreshAccessToken(
      credential.refreshToken,
    );
    credential.accessToken = accessToken;
    await this.googleSheetsCredentialRepository.save(credential);
    return { accessToken, apiKey };
  }

  async createConnectionFromPicker(user: User, workspaceId: string, dto: ConnectPickerSheetDto) {
    const credential = await this.findCredential(user.id, workspaceId);

    if (!credential?.refreshToken) {
      throw new BadRequestException('Google account is not connected.');
    }

    const info = await this.googleSheetsApiService.getSpreadsheetInfo(
      credential.accessToken,
      dto.spreadsheetId,
    );
    const sheetName = dto.sheetName?.trim() || info.title || dto.spreadsheetId;
    const worksheetName = dto.worksheetName?.trim() || info.firstWorksheet || undefined;

    return this.create(
      user,
      workspaceId,
      {
        sheetId: dto.spreadsheetId,
        sheetName,
        worksheetName,
      },
      credential.accessToken,
      credential.refreshToken,
    );
  }

  getAuthUrl(state?: string): string {
    return this.googleSheetsApiService.getAuthUrl(state);
  }

  async connectWithOAuthCode(
    user: User,
    workspaceId: string,
    code: string,
    sheetId: string,
    worksheetName?: string,
    sheetNameOverride?: string,
  ): Promise<GoogleSheet> {
    const auth = await this.connectOAuthSession(user, workspaceId, code);
    const credential = await this.findCredential(user.id, workspaceId);

    if (!credential) {
      throw new BadRequestException('Google account is not connected.');
    }

    const info = await this.googleSheetsApiService.getSpreadsheetInfo(
      credential.accessToken,
      sheetId,
    );
    const sheetName = sheetNameOverride?.trim() || info.title || sheetId;
    const worksheet = worksheetName || info.firstWorksheet || null;

    return this.create(
      user,
      workspaceId,
      { sheetId, sheetName, worksheetName: worksheet || undefined },
      credential.accessToken,
      credential.refreshToken,
    );
  }

  async create(
    user: User,
    workspaceId: string,
    connectDto: ConnectSheetDto,
    accessToken: string,
    refreshToken: string,
  ): Promise<GoogleSheet> {
    const googleSheet = this.googleSheetRepository.create({
      userId: user.id,
      workspaceId,
      sheetId: connectDto.sheetId,
      sheetName: connectDto.sheetName,
      worksheetName: connectDto.worksheetName || null,
      accessToken,
      refreshToken,
      isActive: true,
    });

    return this.googleSheetRepository.save(googleSheet);
  }

  async findAll(workspaceId: string): Promise<GoogleSheet[]> {
    return this.googleSheetRepository.find({
      where: { workspaceId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<GoogleSheet> {
    const sheet = await this.googleSheetRepository.findOne({
      where: { id, workspaceId },
    });

    if (!sheet) {
      throw new NotFoundException('Google Sheet not found');
    }

    return sheet;
  }

  async updateLastSync(id: string, workspaceId: string): Promise<GoogleSheet> {
    const sheet = await this.findOne(id, workspaceId);
    sheet.lastSync = new Date();
    return this.googleSheetRepository.save(sheet);
  }

  /**
   * Sync transactions to Google Sheet
   */
  async syncTransactions(
    id: string,
    workspaceId: string,
    statementId?: string,
  ): Promise<{ synced: number; sheet: GoogleSheet }> {
    const sheet = await this.findOne(id, workspaceId);

    if (!sheet.isActive) {
      throw new BadRequestException('Google Sheet is not active');
    }

    // Basic guard against placeholder tokens to avoid invalid_request
    if (!sheet.refreshToken || sheet.refreshToken.includes('placeholder')) {
      throw new BadRequestException(
        'Отсутствует refresh token Google. Переподключите таблицу через OAuth.',
      );
    }

    // Verify access
    const hasAccess = await this.googleSheetsApiService.verifyAccess(
      sheet.accessToken,
      sheet.refreshToken,
      sheet.sheetId,
    );

    if (!hasAccess) {
      throw new BadRequestException('No access to Google Sheet. Please reconnect.');
    }

    try {
      // Get transactions to sync
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .leftJoinAndSelect('transaction.branch', 'branch')
        .leftJoinAndSelect('transaction.wallet', 'wallet')
        .innerJoin('transaction.statement', 'statement')
        .where('statement.workspaceId = :workspaceId', { workspaceId })
        .andWhere('statement.googleSheetId = :sheetId', { sheetId: id });

      // If statementId is provided, sync only that statement's transactions
      if (statementId) {
        queryBuilder.andWhere('transaction.statementId = :statementId', { statementId });
      }

      // Only sync transactions that haven't been synced yet (optional: add synced flag)
      // For now, we'll sync all transactions
      const transactions = await queryBuilder.getMany();

      if (transactions.length === 0) {
        this.logger.log(`No transactions to sync for Google Sheet ${id}`);
        sheet.lastSync = new Date();
        await this.googleSheetRepository.save(sheet);
        return { synced: 0, sheet };
      }

      // Load related entities
      const categoryIds = new Set<string>();
      const branchIds = new Set<string>();
      const walletIds = new Set<string>();

      transactions.forEach(t => {
        if (t.categoryId) categoryIds.add(t.categoryId);
        if (t.branchId) branchIds.add(t.branchId);
        if (t.walletId) walletIds.add(t.walletId);
      });

      const categories = await this.categoryRepository.find({
        where: Array.from(categoryIds).map(id => ({ id })),
      });
      const branches = await this.branchRepository.find({
        where: Array.from(branchIds).map(id => ({ id })),
      });
      const wallets = await this.walletRepository.find({
        where: Array.from(walletIds).map(id => ({ id })),
      });

      // Create maps for quick lookup
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const branchMap = new Map(branches.map(b => [b.id, b]));
      const walletMap = new Map(wallets.map(w => [w.id, w]));

      const credential = await this.findCredential(sheet.userId, workspaceId);

      // Refresh access token if needed
      let accessToken = sheet.accessToken;
      const refreshToken = sheet.refreshToken || credential?.refreshToken || '';

      if ((!sheet.refreshToken || sheet.refreshToken.includes('placeholder')) && refreshToken) {
        sheet.refreshToken = refreshToken;
      }

      try {
        const hasValidAccess = await this.googleSheetsApiService.verifyAccess(
          accessToken,
          refreshToken,
          sheet.sheetId,
        );
        if (!hasValidAccess) {
          accessToken = await this.googleSheetsApiService.refreshAccessToken(refreshToken);
          // Update stored token
          sheet.accessToken = accessToken;
          if (credential) {
            credential.accessToken = accessToken;
            await this.googleSheetsCredentialRepository.save(credential);
          }
          await this.googleSheetRepository.save(sheet);
        }
      } catch (error) {
        this.logger.error('Error verifying/refreshing access token:', error);
        throw new BadRequestException('Failed to authenticate with Google Sheets');
      }

      // Write transactions to Google Sheet
      await this.googleSheetsApiService.appendTransactions(
        accessToken,
        refreshToken,
        sheet.sheetId,
        sheet.worksheetName,
        transactions,
        categoryMap,
        branchMap,
        walletMap,
      );

      // Update last sync time
      sheet.lastSync = new Date();
      await this.googleSheetRepository.save(sheet);

      this.logger.log(
        `Successfully synced ${transactions.length} transactions to Google Sheet ${id}`,
      );

      return { synced: transactions.length, sheet };
    } catch (error) {
      this.logger.error(`Error syncing transactions to Google Sheet ${id}:`, error);
      throw new BadRequestException(`Failed to sync transactions: ${error.message}`);
    }
  }

  /**
   * Sync transactions for a specific statement
   */
  async syncStatementTransactions(
    googleSheetId: string,
    statementId: string,
    workspaceId: string,
  ): Promise<{ synced: number }> {
    const result = await this.syncTransactions(googleSheetId, workspaceId, statementId);
    return { synced: result.synced };
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const sheet = await this.findOne(id, workspaceId);
    sheet.isActive = false;
    await this.googleSheetRepository.save(sheet);
  }
}
