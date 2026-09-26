import apiClient from '@/app/lib/api';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type InvoiceRecurrenceInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  billingAddress: string | null;
  taxId: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  billingAddress?: string;
  taxId?: string;
  currency?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRateId: string | null;
  categoryId: string | null;
  sortOrder: number;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string;
  categoryId?: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  clientId: string;
  client?: Client;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  notes: string | null;
  payableId: string | null;
  journalEntryId: string | null;
  isRecurring: boolean;
  recurrenceInterval: InvoiceRecurrenceInterval | null;
  nextIssueDate: string | null;
  recurrenceEndDate: string | null;
  lineItems?: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  notes?: string;
  lineItems: InvoiceLineItemInput[];
  recurrenceInterval?: InvoiceRecurrenceInterval;
  recurrenceEndDate?: string;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  clientId?: string;
}

export interface ListInvoicesResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const unwrapData = <T>(response: { data: T }) => response.data;

export const clientsApi = {
  async list(): Promise<Client[]> {
    const response = await apiClient.get<Client[]>('/clients');
    return unwrapData(response);
  },
  async getOne(id: string): Promise<Client> {
    const response = await apiClient.get<Client>(`/clients/${id}`);
    return unwrapData(response);
  },
  async create(payload: CreateClientInput): Promise<Client> {
    const response = await apiClient.post<Client>('/clients', payload);
    return unwrapData(response);
  },
  async update(id: string, payload: UpdateClientInput): Promise<Client> {
    const response = await apiClient.put<Client>(`/clients/${id}`, payload);
    return unwrapData(response);
  },
  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/clients/${id}`);
    return unwrapData(response);
  },
};

export const invoicesApi = {
  async list(params: ListInvoicesParams = {}): Promise<ListInvoicesResponse> {
    const response = await apiClient.get<ListInvoicesResponse>('/invoices', { params });
    return unwrapData(response);
  },
  async getOne(id: string): Promise<Invoice> {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return unwrapData(response);
  },
  async create(payload: CreateInvoiceInput): Promise<Invoice> {
    const response = await apiClient.post<Invoice>('/invoices', payload);
    return unwrapData(response);
  },
  async update(id: string, payload: UpdateInvoiceInput): Promise<Invoice> {
    const response = await apiClient.put<Invoice>(`/invoices/${id}`, payload);
    return unwrapData(response);
  },
  async send(id: string): Promise<Invoice> {
    const response = await apiClient.put<Invoice>(`/invoices/${id}/send`);
    return unwrapData(response);
  },
  async void(id: string): Promise<Invoice> {
    const response = await apiClient.put<Invoice>(`/invoices/${id}/void`);
    return unwrapData(response);
  },
  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/invoices/${id}`);
    return unwrapData(response);
  },
  async getSettings(): Promise<{ prefix: string }> {
    const response = await apiClient.get<{ prefix: string }>('/invoices/settings');
    return unwrapData(response);
  },
  async updateSettings(prefix: string): Promise<{ prefix: string }> {
    const response = await apiClient.put<{ prefix: string }>('/invoices/settings', { prefix });
    return unwrapData(response);
  },
  async downloadPdf(id: string, fileName: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
