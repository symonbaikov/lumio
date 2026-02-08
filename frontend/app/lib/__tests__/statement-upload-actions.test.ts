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

  it('uses create expense label for local action', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: true,
      dropboxConnected: false,
    });

    expect(model.find(item => item.id === 'local-upload')?.label).toBe('Create expense');
  });

  it('uses cloud label and keeps cloud action enabled when not connected', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: false,
      dropboxConnected: false,
    });

    expect(model.find(item => item.id === 'cloud-import')).toMatchObject({
      label: 'Cloud',
      disabled: false,
      provider: undefined,
    });
  });

  it('uses local upload event name as a stable constant', () => {
    expect(STATEMENTS_OPEN_UPLOAD_MODAL_EVENT).toBe('statements:open-upload-modal');
  });
});
