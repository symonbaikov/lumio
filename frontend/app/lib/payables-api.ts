import apiClient from '@/app/lib/api';

export type PayableStatus = 'to_pay' | 'scheduled' | 'paid' | 'overdue' | 'archived';
export type PayableSource = 'statement' | 'invoice' | 'manual';
export type PayablesExportFormat = 'csv' | 'excel';
/** `payable` is money the workspace owes; `receivable` is money owed to it. */
export type PayableDirection = 'payable' | 'receivable';

export interface Payable {
  id: string;
  direction: PayableDirection;
  vendor: string;
  amount: number | string;
  currency: string;
  dueDate: string | null;
  status: PayableStatus;
  linkedTransactionId: string | null;
  source: PayableSource;
  isRecurring: boolean;
  comment: string | null;
  statementId: string | null;
  paidAt: string | null;
  dueSoonNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ListPayablesParams {
  direction?: PayableDirection;
  page?: number;
  limit?: number;
  search?: string;
  status?: PayableStatus;
  source?: PayableSource;
  dueDateFrom?: string;
  dueDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  includeArchived?: boolean;
  sort?: 'dueDateAsc' | 'dueDateDesc' | 'amountDesc' | 'vendorAsc';
}

export interface ListPayablesResponse {
  data: Payable[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayablesSummary {
  toPay: number;
  overdue: number;
  dueThisWeek: number;
  paidThisMonth: number;
  paidTotal: number;
  toPayCount: number;
  overdueCount: number;
  paidTotalCount: number;
}

export interface CreatePayableInput {
  direction?: PayableDirection;
  vendor: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  status?: PayableStatus;
  linkedTransactionId?: string;
  source?: PayableSource;
  isRecurring?: boolean;
  comment?: string;
  statementId?: string;
}

export interface UpdatePayableInput {
  vendor?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  status?: PayableStatus;
  linkedTransactionId?: string | null;
  source?: PayableSource;
  isRecurring?: boolean;
  comment?: string | null;
  statementId?: string | null;
}

export interface MarkPayablePaidInput {
  linkedTransactionId?: string;
}

export interface ExportPayablesParams extends ListPayablesParams {
  format: PayablesExportFormat;
}

export interface ExportPayablesResult {
  blob: Blob;
  fileName: string;
  contentType: string;
}

const FALLBACK_EXPORT_FILE_NAME = 'payables-export';

const unwrapData = <T>(response: { data: T }) => response.data;

const parseContentDispositionFilename = (headerValue?: string): string => {
  if (!headerValue) return FALLBACK_EXPORT_FILE_NAME;

  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || FALLBACK_EXPORT_FILE_NAME;
};

export const payablesApi = {
  async list(params: ListPayablesParams = {}): Promise<ListPayablesResponse> {
    const response = await apiClient.get<ListPayablesResponse>('/payables', { params });
    return unwrapData(response);
  },

  async getOne(id: string): Promise<Payable> {
    const response = await apiClient.get<Payable>(`/payables/${id}`);
    return unwrapData(response);
  },

  async getSummary(direction?: PayableDirection): Promise<PayablesSummary> {
    const response = await apiClient.get<PayablesSummary>('/payables/summary', {
      params: direction ? { direction } : undefined,
    });
    return unwrapData(response);
  },

  async create(payload: CreatePayableInput): Promise<Payable> {
    const response = await apiClient.post<Payable>('/payables', payload);
    return unwrapData(response);
  },

  async update(id: string, payload: UpdatePayableInput): Promise<Payable> {
    const response = await apiClient.put<Payable>(`/payables/${id}`, payload);
    return unwrapData(response);
  },

  async markAsPaid(id: string, payload: MarkPayablePaidInput = {}): Promise<Payable> {
    const response = await apiClient.put<Payable>(`/payables/${id}/mark-paid`, payload);
    return unwrapData(response);
  },

  async archive(id: string): Promise<Payable> {
    const response = await apiClient.put<Payable>(`/payables/${id}/archive`);
    return unwrapData(response);
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/payables/${id}`);
    return unwrapData(response);
  },

  async exportList(params: ExportPayablesParams): Promise<ExportPayablesResult> {
    const response = await apiClient.post<Blob>('/payables/export', params, {
      responseType: 'blob',
    });

    return {
      blob: response.data,
      fileName: parseContentDispositionFilename(response.headers['content-disposition']),
      contentType:
        response.headers['content-type'] || response.data.type || 'application/octet-stream',
    };
  },
};
