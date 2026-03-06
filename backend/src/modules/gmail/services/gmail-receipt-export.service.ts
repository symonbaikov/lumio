import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { In, Repository } from 'typeorm';
import { Category, Receipt } from '../../../entities';
import { GmailOAuthService } from './gmail-oauth.service';

@Injectable()
export class GmailReceiptExportService {
  private readonly logger = new Logger(GmailReceiptExportService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly gmailOAuthService: GmailOAuthService,
  ) {}

  async exportToSheets(
    userId: string,
    receiptIds: string[],
    spreadsheetId?: string,
  ): Promise<{ spreadsheetId: string; url: string }> {
    try {
      // Fetch receipts with parsed data
      const receipts = await this.receiptRepository.find({
        where: {
          id: In(receiptIds),
          userId,
        },
        order: {
          receivedAt: 'DESC',
        },
      });

      if (receipts.length === 0) {
        throw new Error('No receipts found');
      }

      // Get OAuth client for the user via Gmail OAuth service (includes Sheets scope)
      const { client: oauth2Client } = await this.gmailOAuthService.getGmailClient(userId);
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      let finalSpreadsheetId = spreadsheetId;
      let sheetUrl = '';

      // Create new spreadsheet or use existing one
      if (!finalSpreadsheetId) {
        const createResponse = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: `Lumio Receipts Export - ${new Date().toISOString().split('T')[0]}`,
            },
            sheets: [
              {
                properties: {
                  title: 'Receipts',
                },
              },
            ],
          },
        });

        finalSpreadsheetId = createResponse.data.spreadsheetId!;
        sheetUrl = createResponse.data.spreadsheetUrl!;
      } else {
        sheetUrl = `https://docs.google.com/spreadsheets/d/${finalSpreadsheetId}`;
      }

      // Prepare header row
      const headers = [
        'Date',
        'Merchant',
        'Amount',
        'Currency',
        'Tax',
        'Subtotal',
        'Category',
        'Status',
        'Gmail Link',
        'Confidence',
      ];

      // Prepare data rows
      const rows = [headers];
      for (const receipt of receipts) {
        rows.push(this.formatReceiptRow(receipt));
      }

      // Write data to sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: finalSpreadsheetId,
        range: 'Receipts!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });

      // Format header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: finalSpreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length,
                },
              },
            },
          ],
        },
      });

      this.logger.log(`Exported ${receipts.length} receipts to spreadsheet ${finalSpreadsheetId}`);

      return {
        spreadsheetId: finalSpreadsheetId,
        url: sheetUrl,
      };
    } catch (error) {
      this.logger.error('Failed to export receipts to sheets', error);
      throw error;
    }
  }

  formatReceiptRow(receipt: Receipt): any[] {
    const parsedData = receipt.parsedData || {};
    const gmailLink = `https://mail.google.com/mail/u/0/#all/${receipt.gmailMessageId}`;

    return [
      parsedData.date || receipt.receivedAt.toISOString().split('T')[0],
      parsedData.vendor || receipt.sender,
      parsedData.amount || '',
      parsedData.currency || 'KZT',
      parsedData.tax || '',
      parsedData.subtotal || '',
      parsedData.category || '',
      receipt.status,
      gmailLink,
      parsedData.confidence ? `${Math.round(parsedData.confidence * 100)}%` : '',
    ];
  }
}
