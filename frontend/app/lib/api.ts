import axios, { type AxiosResponse } from 'axios';

type GmailReceiptParsedDataUpdate = {
  amount?: number;
  currency?: string;
  vendor?: string;
  date?: string;
  tax?: number;
  paymentMethod?: string;
  category?: string | null;
  categoryId?: string | null;
  lineItems?: Array<{ description: string; amount: number }>;
  transactionType?: 'income' | 'expense' | 'transfer' | 'unknown';
  confidence?: number;
  validationIssues?: string[];
};

type ApproveReceiptPayload = {
  description?: string;
  categoryId?: string;
  category?: string;
  amount?: number;
  currency?: string;
  vendor?: string | null;
  date?: string | null;
  tax?: number;
  paymentMethod?: string;
  lineItems?: Array<{ description: string; amount: number }>;
};

type UpdateReceiptPayload = Partial<ReceiptRecord>;

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/v1' : '/api/v1');

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for adding auth token and workspace context
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add workspace context header
    const workspaceId = localStorage.getItem('currentWorkspaceId');
    if (workspaceId) {
      config.headers['X-Workspace-Id'] = workspaceId;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

async function handleForbiddenError(error: unknown): Promise<never> {
  localStorage.removeItem('currentWorkspaceId');
  window.location.href = '/workspaces';
  return Promise.reject(error);
}

async function refreshAccessToken(originalRequest: Record<string, unknown>): Promise<unknown> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return Promise.reject(new Error('No refresh token'));

  const response = await axios.post(
    `${apiBaseUrl}/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );

  const { access_token } = response.data as { access_token: string };
  localStorage.setItem('access_token', access_token);
  (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${access_token}`;

  return apiClient(originalRequest);
}

const AUTH_RETRY_EXCLUDED_PATHS = new Set(['/auth/login', '/auth/register', '/auth/refresh']);

function isAuthRetryExcludedRequest(originalRequest: Record<string, unknown>): boolean {
  const url = typeof originalRequest.url === 'string' ? originalRequest.url : '';

  try {
    return AUTH_RETRY_EXCLUDED_PATHS.has(
      new URL(url, apiBaseUrl).pathname.replace(/\/api\/v1/, ''),
    );
  } catch {
    return AUTH_RETRY_EXCLUDED_PATHS.has(url.split('?')[0] ?? url);
  }
}

function isForbiddenWorkspaceError(error: Record<string, unknown>): boolean {
  const response = error.response as { status?: number; data?: { message?: string } } | undefined;
  return (
    response?.status === 403 &&
    typeof response?.data?.message === 'string' &&
    response.data.message.includes('workspace')
  );
}

function isUnauthorizedRetryable(
  error: Record<string, unknown>,
  originalRequest: Record<string, unknown>,
): boolean {
  const response = error.response as { status?: number } | undefined;
  return (
    response?.status === 401 &&
    !originalRequest._retry &&
    !isAuthRetryExcludedRequest(originalRequest)
  );
}

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    const err = error as Record<string, unknown>;
    const originalRequest = err.config as Record<string, unknown>;

    if (isForbiddenWorkspaceError(err)) {
      return handleForbiddenError(error);
    }

    if (isUnauthorizedRetryable(err, originalRequest)) {
      originalRequest._retry = true;
      try {
        return await refreshAccessToken(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Gmail Receipts API
export const gmailReceiptsApi = {
  getReceipt: (id: string): Promise<AxiosResponse> =>
    apiClient.get(`/integrations/gmail/receipts/${id}`),

  updateReceiptParsedData: (
    id: string,
    data: GmailReceiptParsedDataUpdate,
  ): Promise<AxiosResponse> =>
    apiClient.patch(`/integrations/gmail/receipts/${id}/parsed-data`, data),

  markDuplicate: (id: string, originalId: string): Promise<AxiosResponse> =>
    apiClient.post(`/integrations/gmail/receipts/${id}/mark-duplicate`, {
      originalReceiptId: originalId,
    }),

  unmarkDuplicate: (id: string): Promise<AxiosResponse> =>
    apiClient.post(`/integrations/gmail/receipts/${id}/unmark-duplicate`),

  bulkApproveReceipts: (receiptIds: string[], categoryId?: string): Promise<AxiosResponse> =>
    apiClient.post('/integrations/gmail/receipts/bulk-approve', { receiptIds, categoryId }),

  exportReceiptsToSheets: (receiptIds: string[], spreadsheetId?: string): Promise<AxiosResponse> =>
    apiClient.post('/integrations/gmail/receipts/export-sheets', { receiptIds, spreadsheetId }),

  exportReceiptToDraft: (receiptId: string): Promise<AxiosResponse> =>
    apiClient.post(`/integrations/gmail/receipts/${receiptId}/export-draft`),

  getReceiptPreview: (id: string): Promise<AxiosResponse> =>
    apiClient.get(`/integrations/gmail/receipts/${id}/preview`),

  listReceipts: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
    includeInvalid?: boolean;
    hasAmount?: boolean;
    categoryId?: string;
  }): Promise<AxiosResponse> => apiClient.get('/integrations/gmail/receipts', { params }),

  approveReceipt: (id: string, data: ApproveReceiptPayload): Promise<AxiosResponse> =>
    apiClient.post(`/integrations/gmail/receipts/${id}/approve`, data),

  updateReceipt: (id: string, data: UpdateReceiptPayload): Promise<AxiosResponse> =>
    apiClient.patch(`/integrations/gmail/receipts/${id}`, data),

  getStatus: (): Promise<AxiosResponse> => apiClient.get('/integrations/gmail/status'),
};

export interface ReceiptRecord {
  id: string;
  statementId?: string | null;
  subject: string;
  sender: string;
  source: string;
  status: string;
  receivedAt: string;
  language?: string | null;
  metadata?: {
    attachments?: Array<{
      id?: string;
      filename?: string;
      mimeType?: string;
      size?: number;
    }>;
  };
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    tax?: number;
    paymentMethod?: string;
    category?: string;
    categoryId?: string;
    lineItems?: Array<{ description: string; amount: number }>;
    transactionType?: 'income' | 'expense' | 'transfer' | 'unknown';
    confidence?: number;
    validationIssues?: string[];
  };
}

export interface ReceiptListFilters {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
}

export interface ReceiptListResponse {
  data: ReceiptRecord[];
  total: number;
  page: number;
  limit: number;
}

export const receiptsApi = {
  listReceipts: async (params?: ReceiptListFilters): Promise<ReceiptListResponse> => {
    const response = await apiClient.get('/receipts', { params });
    return response.data as ReceiptListResponse;
  },

  getReceipt: async (id: string): Promise<ReceiptRecord> => {
    const response = await apiClient.get(`/receipts/${id}`);
    return response.data as ReceiptRecord;
  },

  updateReceipt: async (id: string, data: Partial<ReceiptRecord>): Promise<ReceiptRecord> => {
    const response = await apiClient.patch(`/receipts/${id}`, data);
    return response.data as ReceiptRecord;
  },

  approveReceipt: async (
    id: string,
  ): Promise<{ receipt: ReceiptRecord; transaction: { id: string } }> => {
    const response = await apiClient.post(`/receipts/${id}/approve`);
    return response.data as { receipt: ReceiptRecord; transaction: { id: string } };
  },

  uploadReceipts: async (formData: FormData): Promise<{ receipts: ReceiptRecord[] }> => {
    const response = await apiClient.post('/receipts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as { receipts: ReceiptRecord[] };
  },

  scanReceipt: async (file: File, language?: string): Promise<ReceiptRecord> => {
    const formData = new FormData();
    formData.append('file', file);

    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    const response = await apiClient.post('/receipts/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as ReceiptRecord;
  },
};

export const statementsApi = {
  exportZip: () => apiClient.get('/statements/export-zip', { responseType: 'blob' }),
};

export const api = apiClient;
export default apiClient;
