import { resolveApiBaseForAssets } from './avatar-url';

export const DEFAULT_CONTENT_BACKGROUND_DIM = 35;
export const MAX_CONTENT_BACKGROUND_DIM = 80;
/** Same limit as the upload endpoint. */
export const MAX_CONTENT_BACKGROUND_BYTES = 10 * 1024 * 1024;

const PRESET_PREFIX = '/workspace-backgrounds/';
const API_PATH = '/api/v1';
const UPLOAD_PREFIX = `${API_PATH}/users/backgrounds/`;

/** The saved value for one of the photos bundled for workspaces. */
export const toPresetBackground = (fileName: string): string => `${PRESET_PREFIX}${fileName}`;

/** File name of a bundled photo, or null when nothing or an upload is saved. */
export const presetFileName = (value: string | null | undefined): string | null =>
  value?.startsWith(PRESET_PREFIX) ? value.slice(PRESET_PREFIX.length) : null;

/** Uploads are served by the API, which may sit on another origin than the app. */
export function resolveContentBackgroundSrc(value: string): string {
  return value.startsWith(UPLOAD_PREFIX)
    ? `${resolveApiBaseForAssets()}${value.slice(API_PATH.length)}`
    : value;
}
