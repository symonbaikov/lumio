import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appError } from '../../../common/errors/app-error';
import type { Branch } from '../../../entities/branch.entity';
import type { Category } from '../../../entities/category.entity';
import type { Transaction } from '../../../entities/transaction.entity';
import type { Wallet } from '../../../entities/wallet.entity';
import {
  createSheetWriteContext,
  isRetryableCredentialError,
  mapTransactionsToValues,
} from './google-sheets-api.util';

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

type GoogleSheetsError = { code?: number; message?: string };
type SheetCellValue = string | number | boolean | null;
type SheetValues = SheetCellValue[][];

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type GoogleSpreadsheet = {
  properties?: { title?: string };
  sheets?: Array<{
    properties?: {
      title?: string;
      index?: number;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
    data?: unknown[];
  }>;
};

type GoogleValuesResponse = {
  range?: string;
  values?: SheetValues;
};

type GoogleUserInfoResponse = {
  email?: string;
};

type SheetsClient = {
  spreadsheets: {
    get(args: {
      spreadsheetId: string;
      ranges?: string[];
      includeGridData?: boolean;
      fields?: string;
    }): Promise<{ data: GoogleSpreadsheet }>;
    values: {
      get(args: {
        spreadsheetId: string;
        range: string;
        valueRenderOption?: string;
        dateTimeRenderOption?: string;
      }): Promise<{ data: GoogleValuesResponse }>;
      update(args: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        requestBody: { values: SheetValues };
      }): Promise<{ data: unknown }>;
      append(args: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        insertDataOption: string;
        requestBody: { values: SheetValues };
      }): Promise<{ data: unknown }>;
    };
  };
};

@Injectable()
export class GoogleSheetsApiService {
  private readonly logger = new Logger(GoogleSheetsApiService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getGoogleSheetsError(error: unknown): GoogleSheetsError {
    if (typeof error === 'object' && error !== null) {
      return error as GoogleSheetsError;
    }
    return { message: this.getErrorMessage(error) };
  }

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    this.redirectUri =
      this.configService.get<string>('GOOGLE_SHEETS_REDIRECT_URI') ||
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      '';

    if (!(this.clientId && this.clientSecret)) {
      this.logger.warn('Google OAuth credentials not configured');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (!refreshToken || refreshToken.includes('placeholder')) {
      throw new BadRequestException(appError('SHEETS_REFRESH_TOKEN_MISSING'));
    }

    try {
      const tokenResponse = await this.requestToken({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      const accessToken = tokenResponse.access_token;
      if (!accessToken) {
        throw new Error('Access token was not returned on refresh');
      }
      return accessToken;
    } catch (error) {
      this.logger.error('Error refreshing access token:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to refresh Google access token',
      );
    }
  }

  /**
   * Get authenticated Google Sheets client
   */
  private getSheetsClient(accessToken: string): SheetsClient {
    return {
      spreadsheets: {
        get: async args => ({
          data: await this.googleJson<GoogleSpreadsheet>(
            accessToken,
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}?${new URLSearchParams(
              {
                ...(args.ranges?.length ? { ranges: args.ranges[0] } : {}),
                ...(args.includeGridData !== undefined
                  ? { includeGridData: String(args.includeGridData) }
                  : {}),
                ...(args.fields ? { fields: args.fields } : {}),
              },
            ).toString()}`,
          ),
        }),
        values: {
          get: async args => ({
            data: await this.googleJson<GoogleValuesResponse>(
              accessToken,
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}/values/${encodeURIComponent(args.range)}?${new URLSearchParams(
                {
                  ...(args.valueRenderOption ? { valueRenderOption: args.valueRenderOption } : {}),
                  ...(args.dateTimeRenderOption
                    ? { dateTimeRenderOption: args.dateTimeRenderOption }
                    : {}),
                },
              ).toString()}`,
            ),
          }),
          update: async args => ({
            data: await this.googleJson(
              accessToken,
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}/values/${encodeURIComponent(args.range)}?${new URLSearchParams(
                {
                  valueInputOption: args.valueInputOption,
                },
              ).toString()}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args.requestBody),
              },
            ),
          }),
          append: async args => ({
            data: await this.googleJson(
              accessToken,
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}/values/${encodeURIComponent(args.range)}:append?${new URLSearchParams(
                {
                  valueInputOption: args.valueInputOption,
                  insertDataOption: args.insertDataOption,
                },
              ).toString()}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args.requestBody),
              },
            ),
          }),
        },
      },
    };
  }

  private async googleJson<T>(
    accessToken: string,
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const error = new Error(`Google Sheets REST request failed with status ${response.status}`);
      (error as GoogleSheetsError).code = response.status;
      throw error;
    }
    return (await response.json()) as T;
  }

  private async requestToken(params: Record<string, string>): Promise<GoogleTokenResponse> {
    if (!(this.clientId && this.clientSecret && this.redirectUri)) {
      throw new BadRequestException('Google OAuth credentials are not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        ...params,
      }),
    });
    if (!response.ok) {
      throw new Error(`Google OAuth token request failed with status ${response.status}`);
    }
    return (await response.json()) as GoogleTokenResponse;
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    if (!(this.clientId && this.redirectUri)) {
      throw new BadRequestException('Google OAuth credentials are not configured');
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes.join(' '),
      include_granted_scopes: 'true',
      ...(state ? { state } : {}),
    }).toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const tokens = await this.requestToken({
        grant_type: 'authorization_code',
        code,
      });
      const accessToken = tokens.access_token || '';
      const refreshToken = tokens.refresh_token || '';

      if (!refreshToken) {
        this.logger.warn('No refresh token returned by Google. Prompt might need consent.');
      }

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to exchange OAuth code for tokens:', error);
      throw new BadRequestException(appError('SHEETS_AUTH_CODE_EXCHANGE_FAILED'));
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
      throw new BadRequestException(appError('SHEETS_READ_FAILED'));
    }
  }

  async getUserInfo(accessToken: string): Promise<{ email: string | null }> {
    try {
      const response = await this.googleJson<GoogleUserInfoResponse>(
        accessToken,
        'https://www.googleapis.com/oauth2/v2/userinfo',
      );
      return {
        email: response.email || null,
      };
    } catch (error) {
      this.logger.warn('Failed to read Google account info', error);
      return { email: null };
    }
  }

  async listWorksheets(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<Array<{ title: string; index: number; rowCount: number; columnCount: number }>> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets(properties(title,index,gridProperties(rowCount,columnCount)))',
      });

      return (response.data.sheets || []).map(sheet => ({
        title: sheet.properties?.title || 'Sheet1',
        index: sheet.properties?.index || 0,
        rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        columnCount: sheet.properties?.gridProperties?.columnCount || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to list worksheets:', error);
      throw new BadRequestException(appError('SHEETS_WORKSHEET_LIST_FAILED'));
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
    const amountKzt = transaction.amount || transaction.debit || transaction.credit || 0;

    // Format date as DD.MM.YYYY
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

    return {
      monthText: monthNames[date.getMonth()],
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      transactionDate: formattedDate,
      amountKZT: amountKzt,
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
  private rowToValues(row: SheetRow): SheetCellValue[] {
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

  private buildSheetValues(
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): SheetValues {
    return mapTransactionsToValues(
      transactions,
      categories,
      branches,
      wallets,
      (transaction, category, branch, wallet) =>
        this.mapTransactionToRow(transaction, category, branch, wallet),
      row => this.rowToValues(row),
    );
  }

  private getSheetContext(accessToken: string, worksheetName: string | null) {
    return createSheetWriteContext(accessToken, worksheetName, token =>
      this.getSheetsClient(token),
    );
  }

  private async handleSheetWriteError(
    error: { code?: number; message?: string },
    refreshToken: string,
    retry: (accessToken: string) => Promise<void>,
    action: 'write' | 'append',
  ): Promise<void> {
    if (isRetryableCredentialError(error)) {
      this.logger.log('Access token expired, refreshing...');
      const newAccessToken = await this.refreshAccessToken(refreshToken);
      return retry(newAccessToken);
    }

    this.logger.error(`Error ${action}ing to Google Sheet:`, error);
    throw new BadRequestException(`Failed to ${action} to Google Sheet: ${error.message}`);
  }

  private async runTransactionWrite(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
    action: 'write' | 'append',
    perform: (context: {
      sheets: ReturnType<GoogleSheetsApiService['getSheetsClient']>;
      sheetName: string;
      range: string;
      values: SheetValues;
    }) => Promise<void>,
  ): Promise<void> {
    const { sheets, sheetName, range } = this.getSheetContext(accessToken, worksheetName);

    try {
      const values = this.buildSheetValues(transactions, categories, branches, wallets);
      await perform({ sheets, sheetName, range, values });
      this.logger.log(
        `Successfully ${action === 'write' ? 'wrote' : 'appended'} ${transactions.length} transactions to Google Sheet ${spreadsheetId}`,
      );
    } catch (error) {
      return this.handleSheetWriteError(
        this.getGoogleSheetsError(error),
        refreshToken,
        newAccessToken =>
          this.runTransactionWrite(
            newAccessToken,
            refreshToken,
            spreadsheetId,
            worksheetName,
            transactions,
            categories,
            branches,
            wallets,
            action,
            perform,
          ),
        action,
      );
    }
  }

  /**
   * Find the first empty row in the sheet
   */
  private async findFirstEmptyRow(
    sheets: ReturnType<GoogleSheetsApiService['getSheetsClient']>,
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
    return this.runTransactionWrite(
      accessToken,
      refreshToken,
      spreadsheetId,
      worksheetName,
      transactions,
      categories,
      branches,
      wallets,
      'write',
      async ({ sheets, sheetName, range, values }) => {
        const startRow = await this.findFirstEmptyRow(sheets, spreadsheetId, range);
        const writeRange = `${sheetName}!A${startRow}:S${startRow + values.length - 1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: writeRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });
      },
    );
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
    return this.runTransactionWrite(
      accessToken,
      refreshToken,
      spreadsheetId,
      worksheetName,
      transactions,
      categories,
      branches,
      wallets,
      'append',
      async ({ sheets, range, values }) => {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values },
        });
      },
    );
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
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
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
  ): Promise<{ accessToken: string; range: string; values: SheetValues }> {
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
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getValues(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading values from Google Sheet:', error);
      throw new BadRequestException(`Failed to read Google Sheet values: ${sheetsError.message}`);
    }
  }

  async getGridData(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    range: string,
    options?: { fields?: string },
  ): Promise<{ accessToken: string; spreadsheet: GoogleSpreadsheet }> {
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
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getGridData(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading grid data from Google Sheet:', error);
      throw new BadRequestException(
        `Failed to read Google Sheet grid data: ${sheetsError.message}`,
      );
    }
  }
}
