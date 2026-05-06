import axios, { type AxiosInstance, type AxiosError } from 'axios';

const BASE_URL = process.env.LUMIO_BASE_URL ?? 'http://localhost:3001/api/v1';
const API_KEY = process.env.LUMIO_API_KEY ?? '';
const WORKSPACE_ID = process.env.LUMIO_WORKSPACE_ID ?? '';

if (!API_KEY) {
  process.stderr.write('LUMIO_API_KEY environment variable is required\n');
  process.exit(1);
}

if (!WORKSPACE_ID) {
  process.stderr.write('LUMIO_WORKSPACE_ID environment variable is required\n');
  process.exit(1);
}

export const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Api-Key': API_KEY,
    'x-workspace-id': WORKSPACE_ID,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

client.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;
    const message =
      (data?.error as Record<string, unknown>)?.message ??
      data?.message ??
      error.message;
    throw new Error(`Lumio API error ${status}: ${message}`);
  },
);
