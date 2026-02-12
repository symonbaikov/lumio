import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Handle 403 Forbidden - workspace access denied
    if (error.response?.status === 403 && error.response?.data?.message?.includes('workspace')) {
      // Clear current workspace and redirect to workspace selector
      localStorage.removeItem('currentWorkspaceId');
      window.location.href = '/workspaces';
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            },
          );

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
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
  getReceipt: (id: string) => apiClient.get(`/integrations/gmail/receipts/${id}`),

  updateReceiptParsedData: (id: string, data: any) =>
    apiClient.patch(`/integrations/gmail/receipts/${id}/parsed-data`, data),

  markDuplicate: (id: string, originalId: string) =>
    apiClient.post(`/integrations/gmail/receipts/${id}/mark-duplicate`, { originalReceiptId: originalId }),

  unmarkDuplicate: (id: string) =>
    apiClient.post(`/integrations/gmail/receipts/${id}/unmark-duplicate`),

  bulkApproveReceipts: (receiptIds: string[], categoryId?: string) =>
    apiClient.post('/integrations/gmail/receipts/bulk-approve', { receiptIds, categoryId }),

  exportReceiptsToSheets: (receiptIds: string[], spreadsheetId?: string) =>
    apiClient.post('/integrations/gmail/receipts/export-sheets', { receiptIds, spreadsheetId }),

  getReceiptPreview: (id: string) =>
    apiClient.get(`/integrations/gmail/receipts/${id}/preview`),

  listReceipts: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
    includeInvalid?: boolean;
    hasAmount?: boolean;
  }) =>
    apiClient.get('/integrations/gmail/receipts', { params }),

  approveReceipt: (id: string, data: any) =>
    apiClient.post(`/integrations/gmail/receipts/${id}/approve`, data),

  updateReceipt: (id: string, data: any) =>
    apiClient.patch(`/integrations/gmail/receipts/${id}`, data),

  getStatus: () => apiClient.get('/integrations/gmail/status'),
};

export const api = apiClient;
export default apiClient;
