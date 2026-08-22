import type { ChangelogEntry } from '@/app/components/ChangelogModal';
import type { LucideProps } from '@/app/components/icons';
import { Bot, Monitor, Smartphone, Tablet } from '@/app/components/icons';
import type { AxiosError } from 'axios';
import type React from 'react';

export type ApiErrorResponse = { message?: string; error?: { message?: string } };

export type UserSession = {
  id: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

export type TimeZoneOption = {
  value: string;
  label: string;
};

export type NotificationPreferences = {
  statementUploaded: boolean;
  importCommitted: boolean;
  categoryChanges: boolean;
  memberActivity: boolean;
  dataDeleted: boolean;
  workspaceUpdated: boolean;
  parsingErrors: boolean;
  importFailures: boolean;
  uncategorizedItems: boolean;
};

export interface ChangelogPayload {
  entries?: ChangelogEntry[];
}

export const defaultNotificationPreferences: NotificationPreferences = {
  statementUploaded: true,
  importCommitted: true,
  categoryChanges: true,
  memberActivity: true,
  dataDeleted: true,
  workspaceUpdated: true,
  parsingErrors: true,
  importFailures: true,
  uncategorizedItems: true,
};

export const workspaceNotificationSettings: Array<{ key: keyof NotificationPreferences }> = [
  { key: 'statementUploaded' },
  { key: 'importCommitted' },
  { key: 'categoryChanges' },
  { key: 'memberActivity' },
  { key: 'dataDeleted' },
  { key: 'workspaceUpdated' },
];

export const systemNotificationSettings: Array<{ key: keyof NotificationPreferences }> = [
  { key: 'parsingErrors' },
  { key: 'importFailures' },
  { key: 'uncategorizedItems' },
];

export const sections = [
  'profile',
  'appearance',
  'sessions',
  'email',
  'password',
  'notifications',
  'changelog',
  'sync',
  'my-data',
] as const;
export type SectionId = (typeof sections)[number];

export const normalizeSection = (value: string | null | undefined): SectionId => {
  if (!value) return 'profile';
  if ((sections as readonly string[]).includes(value)) return value as SectionId;
  return 'profile';
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return (
    axiosError?.response?.data?.message || axiosError?.response?.data?.error?.message || fallback
  );
};

export const getInitials = (value: string) => {
  if (!value) return '—';
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '—';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
};

export const getSessionIcon = (device: string): React.ComponentType<LucideProps> => {
  const normalized = device.toLowerCase();
  if (normalized.includes('mobile')) return Smartphone;
  if (normalized.includes('tablet')) return Tablet;
  if (normalized.includes('bot')) return Bot;
  return Monitor;
};

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Asia/Almaty',
  'Asia/Astana',
  'Asia/Tashkent',
  'Europe/Berlin',
  'America/New_York',
];

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

export const resolveTimeZoneOptions = (): string[] => {
  const intl = Intl as IntlWithSupportedValuesOf;
  if (typeof Intl !== 'undefined' && typeof intl.supportedValuesOf === 'function') {
    try {
      const zones = intl.supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) return zones;
    } catch {
      // Fallback below
    }
  }
  return COMMON_TIMEZONES;
};
