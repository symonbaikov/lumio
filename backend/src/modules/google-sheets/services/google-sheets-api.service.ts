import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import type { Branch } from '../../../entities/branch.entity';
import type { Category } from '../../../entities/category.entity';
import type { Transaction } from '../../../entities/transaction.entity';
import type { Wallet } from '../../../entities/wallet.entity';

interface SheetRow {
  monthText: string; // Month (text representation)
  year: number; // Year
  monthNumber: number; // Month (numeric representation)
  transactionDate: string; // Transaction date
  amountKZT: number; // Amount in KZT
  amountForeign: number | null; // Amount in foreign currency
  currencyCode: string; // Currency code
  exchangeRate: number | null; // Exchange rate
  wallet: string | null; // Wallet
  branch: string | null; // Branch
  article: string | null; // Article/Category
  counterparty: string; // Counterparty
  paymentPurpose: string; // Payment purpose
  comments: string | null; // Comments
  activityType: string | null; // Activity type
  transactionType: string; // Transaction type (income/expense)
  usdRate: number | null; // USD Rate
  rubRate: number | null; // RUB Rate
}

@Injectable()
export class GoogleSheetsApiService {
  private readonly logger = new Logger(GoogleSheetsApiService.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret) {
      this.logger.warn('Google OAuth credentials not configured');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (!refreshToken || refreshToken.includes('placeholder')) {
      throw new BadRequestException('Отсутствует валидный refresh token Google');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const tokenResponse = await (this.oauth2Client as any).refreshToken(refreshToken);
      const accessToken =
        (tokenResponse as any)?.tokens?.access_token || (tokenResponse as any)?.access_token;
      if (!accessToken) {
        throw new Error('Access token не получен при обновлении');
      }
      return accessToken;
    } catch (error) {
      this.logger.error('Error refreshing access token:', error);
      throw new BadRequestException(
        error?.response?.data?.error_description ||
          error?.message ||
          'Failed to refresh Google access token',
      );
    }
  }

  /**
   * Get authenticated Google Sheets client
   */
  private getSheetsClient(accessToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      include_granted_scopes: true,
      state,
    });
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      const accessToken = tokens.access_token || '';
      const refreshToken = tokens.refresh_token || '';

      if (!refreshToken) {
        this.logger.warn('No refresh token returned by Google. Prompt might need consent.');
      }

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to exchange OAuth code for tokens:', error);
      throw new BadRequestException('Не удалось обменять код авторизации Google');
    }
  }

  async getSpreadsheetInfo(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<{ title?: string; firstWorksheet?: string }> {
    const sheets = this.getSheetsClient(accessToken);
    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      const title = response.data.properties?.title;
      const firstWorksheet = response.data.sheets?.[0]?.properties?.title;
      return { title, firstWorksheet };
    } catch (error) {
      this.logger.error('Failed to read spreadsheet info:', error);
      throw new BadRequestException('Не удалось прочитать Google Sheet. Проверьте права доступа.');
    }
  }

  /**
   * Map Transaction entity to SheetRow format
   */
  private mapTransactionToRow(
    transaction: Transaction,
    category: Category | null,
    branch: Branch | null,
    wallet: Wallet | null,
  ): SheetRow {
    const date = new Date(transaction.transactionDate);
    const monthNames = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];

    // Determine amount in KZT
    const amountKZT = transaction.amount || transaction.debit || transaction.credit || 0;

    // Format date as DD.MM.YYYY
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

    return {
      monthText: monthNames[date.getMonth()],
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      transactionDate: formattedDate,
      amountKZT,
      amountForeign: transaction.amountForeign,
      currencyCode: transaction.currency || 'KZT',
      exchangeRate: transaction.exchangeRate,
      wallet: wallet?.name || null,
      branch: branch?.name || null,
      article: transaction.article || category?.name || null,
      counterparty: transaction.counterpartyName,
      paymentPurpose: transaction.paymentPurpose,
      comments: transaction.comments,
      activityType: transaction.activityType,
      transactionType: transaction.transactionType,
      usdRate: null, // TODO: Get from external API or store in transaction
      rubRate: null, // TODO: Get from external API or store in transaction
    };
  }

  /**
   * Convert SheetRow to array of values for Google Sheets
   */
  private rowToValues(row: SheetRow): any[] {
    return [
      row.monthText,
      row.year,
      row.monthNumber,
      row.transactionDate,
      row.amountKZT,
      row.amountForeign,
      row.currencyCode,
      row.exchangeRate,
      row.wallet,
      row.branch,
      row.article,
      row.counterparty,
      row.paymentPurpose,
      row.comments,
      row.activityType,
      row.transactionType,
      row.usdRate,
      row.rubRate,
    ];
  }

  /**
   * Find the first empty row in the sheet
   */
  private async findFirstEmptyRow(
    sheets: any,
    spreadsheetId: string,
    range: string,
  ): Promise<number> {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const values = response.data.values || [];
      return values.length + 1; // Return next row number (1-indexed)
    } catch (error) {
      this.logger.error('Error finding empty row:', error);
      return 1; // Start from first row if error
    }
  }

  /**
   * Write transactions to Google Sheet
   */
  async writeTransactions(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): Promise<void> {
    const sheets = this.getSheetsClient(accessToken);
    const sheetName = worksheetName || 'Sheet1';
    const range = `${sheetName}!A:S`; // Columns A to S

    try {
      // Find first empty row
      const startRow = await this.findFirstEmptyRow(sheets, spreadsheetId, range);

      // Map transactions to rows
      const values = transactions.map(transaction => {
        const category = transaction.categoryId ? categories.get(transaction.categoryId) : null;
        const branch = transaction.branchId ? branches.get(transaction.branchId) : null;
        const wallet = transaction.walletId ? wallets.get(transaction.walletId) : null;

        return this.rowToValues(this.mapTransactionToRow(transaction, category, branch, wallet));
      });

      // Write data to sheet
      const writeRange = `${sheetName}!A${startRow}:S${startRow + values.length - 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: writeRange,
        valueInputOption: 'USER_ENTERED', // Preserves formatting and formulas
        requestBody: {
          values,
        },
      });

      this.logger.log(
        `Successfully wrote ${transactions.length} transactions to Google Sheet ${spreadsheetId}`,
      );
    } catch (error: any) {
      // Check if error is due to expired token
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        this.logger.log('Access token expired, refreshing...');
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        // Retry with new token
        return this.writeTransactions(
          newAccessToken,
          refreshToken,
          spreadsheetId,
          worksheetName,
          transactions,
          categories,
          branches,
          wallets,
        );
      }

      this.logger.error('Error writing to Google Sheet:', error);
      throw new BadRequestException(`Failed to write to Google Sheet: ${error.message}`);
    }
  }

  /**
   * Append transactions to Google Sheet (adds to end without overwriting)
   */
  async appendTransactions(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): Promise<void> {
    const sheets = this.getSheetsClient(accessToken);
    const sheetName = worksheetName || 'Sheet1';
    const range = `${sheetName}!A:S`;

    try {
      // Map transactions to rows
      const values = transactions.map(transaction => {
        const category = transaction.categoryId ? categories.get(transaction.categoryId) : null;
        const branch = transaction.branchId ? branches.get(transaction.branchId) : null;
        const wallet = transaction.walletId ? wallets.get(transaction.walletId) : null;

        return this.rowToValues(this.mapTransactionToRow(transaction, category, branch, wallet));
      });

      // Append data to sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS', // Insert new rows instead of overwriting
        requestBody: {
          values,
        },
      });

      this.logger.log(
        `Successfully appended ${transactions.length} transactions to Google Sheet ${spreadsheetId}`,
      );
    } catch (error: any) {
      // Check if error is due to expired token
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        this.logger.log('Access token expired, refreshing...');
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        // Retry with new token
        return this.appendTransactions(
          newAccessToken,
          refreshToken,
          spreadsheetId,
          worksheetName,
          transactions,
          categories,
          branches,
          wallets,
        );
      }

      this.logger.error('Error appending to Google Sheet:', error);
      throw new BadRequestException(`Failed to append to Google Sheet: ${error.message}`);
    }
  }

  /**
   * Verify access to Google Sheet
   */
  async verifyAccess(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
  ): Promise<boolean> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
      });
      return true;
    } catch (error: any) {
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        try {
          const newAccessToken = await this.refreshAccessToken(refreshToken);
          const newSheets = this.getSheetsClient(newAccessToken);
          await newSheets.spreadsheets.get({
            spreadsheetId,
          });
          return true;
        } catch (retryError) {
          this.logger.error('Error verifying access after token refresh:', retryError);
          return false;
        }
      }
      this.logger.error('Error verifying access to Google Sheet:', error);
      return false;
    }
  }

  async getValues(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    range: string,
    options?: {
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
      dateTimeRenderOption?: 'FORMATTED_STRING' | 'SERIAL_NUMBER';
    },
  ): Promise<{ accessToken: string; range: string; values: any[][] }> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: options?.valueRenderOption,
        dateTimeRenderOption: options?.dateTimeRenderOption,
      });

      return {
        accessToken,
        range: response.data.range || range,
        values: response.data.values || [],
      };
    } catch (error: any) {
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getValues(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading values from Google Sheet:', error);
      throw new BadRequestException(`Failed to read Google Sheet values: ${error.message}`);
    }
  }

  async getGridData(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    range: string,
    options?: { fields?: string },
  ): Promise<{ accessToken: string; spreadsheet: any }> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
        fields: options?.fields,
      });

      return {
        accessToken,
        spreadsheet: response.data,
      };
    } catch (error: any) {
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getGridData(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading grid data from Google Sheet:', error);
      throw new BadRequestException(`Failed to read Google Sheet grid data: ${error.message}`);
    }
  }
}
