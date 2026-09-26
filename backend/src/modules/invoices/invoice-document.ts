import type { Client } from '../../entities/client.entity';
import type { Invoice } from '../../entities/invoice.entity';
import type { InvoiceLineItem } from '../../entities/invoice-line-item.entity';
import { loadPdfMake } from '../reports/report-document.util';

/** Rendering a sent invoice as a document, in the currency it was issued in. */

function money(amount: number | string, currency: string): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function lineTotal(lineItem: Pick<InvoiceLineItem, 'quantity' | 'unitPrice'>): number {
  return Number(lineItem.quantity) * Number(lineItem.unitPrice);
}

export async function buildInvoicePdf(
  invoice: Invoice,
  client: Client,
  lineItems: InvoiceLineItem[],
): Promise<Buffer> {
  const pdfMake = await loadPdfMake();
  const cell = (text: string, style?: string) => ({ text, style });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: 'INVOICE', style: 'title' },
      { text: invoice.invoiceNumber ?? '', style: 'invoiceNumber', margin: [0, 0, 0, 16] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Billed to', style: 'label' },
              { text: client.name, style: 'value' },
              client.billingAddress
                ? { text: client.billingAddress, style: 'muted' }
                : { text: '' },
              client.taxId ? { text: `Tax ID: ${client.taxId}`, style: 'muted' } : { text: '' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: `Issue date: ${invoice.issueDate}`, style: 'muted' },
              { text: `Due date: ${invoice.dueDate}`, style: 'muted' },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 70, 70],
          body: [
            ['Description', 'Qty', 'Unit price', 'Amount'].map(text => cell(text, 'tableHeader')),
            ...lineItems.map(item => [
              cell(item.description),
              cell(String(item.quantity)),
              cell(money(item.unitPrice, invoice.currency)),
              cell(money(lineTotal(item), invoice.currency)),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      },
      {
        margin: [0, 16, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [
                [cell('Subtotal', 'summaryLabel'), cell(money(invoice.subtotal, invoice.currency))],
                [cell('Tax', 'summaryLabel'), cell(money(invoice.taxTotal, invoice.currency))],
                [
                  cell('Total', 'summaryLabelBold'),
                  cell(money(invoice.total, invoice.currency), 'summaryValueBold'),
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      invoice.notes ? { text: invoice.notes, style: 'muted', margin: [0, 24, 0, 0] } : { text: '' },
    ],
    styles: {
      title: { bold: true, fontSize: 20 },
      invoiceNumber: { fontSize: 11, color: '#6b7280' },
      label: { fontSize: 9, color: '#6b7280' },
      value: { fontSize: 11, bold: true },
      muted: { fontSize: 9, color: '#6b7280' },
      tableHeader: { bold: true, fontSize: 9 },
      summaryLabel: { fontSize: 10 },
      summaryLabelBold: { fontSize: 10, bold: true },
      summaryValueBold: { fontSize: 10, bold: true },
    },
    defaultStyle: { font: 'Roboto', fontSize: 9 },
  };

  return new Promise<Buffer>(resolve => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer: Uint8Array) => {
      resolve(Buffer.from(buffer));
    });
  });
}
