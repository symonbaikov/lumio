import { describe, expect, it } from 'vitest';

import {
  STATEMENTS_OPEN_UPLOAD_MODAL_EVENT,
  buildStatementUploadMenuModel,
  resolveCloudImportProvider,
} from '../statement-upload-actions';

describe('statement upload actions', () => {
  it('prioritizes Dropbox over Google Drive when both are connected', () => {
    expect(resolveCloudImportProvider({ googleDriveConnected: true, dropboxConnected: true })).toBe(
      'dropbox',
    );
  });

  it('uses Google Drive when Dropbox is not connected', () => {
    expect(
      resolveCloudImportProvider({ googleDriveConnected: true, dropboxConnected: false }),
    ).toBe('google-drive');
  });

  it('returns null cloud provider when no cloud drive is connected', () => {
    expect(
      resolveCloudImportProvider({ googleDriveConnected: false, dropboxConnected: false }),
    ).toBeNull();
  });

  it('builds circular menu model with required three actions', () => {
    expect(
      buildStatementUploadMenuModel({ googleDriveConnected: true, dropboxConnected: false }).map(
        item => item.id,
      ),
    ).toEqual(['scan', 'cloud-import', 'local-upload']);
  });

  it('uses local upload event name as a stable constant', () => {
    expect(STATEMENTS_OPEN_UPLOAD_MODAL_EVENT).toBe('statements:open-upload-modal');
  });
});
