import { describe, expect, it } from 'vitest';

import {
  STATEMENTS_OPEN_UPLOAD_MODAL_EVENT,
  buildStatementUploadMenuModel,
  resolveCloudImportProvider,
} from '../statement-upload-actions';

describe('statement upload actions', () => {
  it('prioritizes Dropbox over Google Drive when both are connected', () => {
    expect(
      resolveCloudImportProvider({
        googleDriveConnected: true,
        dropboxConnected: true,
        gmailConnected: false,
      }),
    ).toBe('dropbox');
  });

  it('uses Google Drive when Dropbox is not connected', () => {
    expect(
      resolveCloudImportProvider({
        googleDriveConnected: true,
        dropboxConnected: false,
        gmailConnected: false,
      }),
    ).toBe('google-drive');
  });

  it('returns null cloud provider when no cloud drive is connected', () => {
    expect(
      resolveCloudImportProvider({
        googleDriveConnected: false,
        dropboxConnected: false,
        gmailConnected: false,
      }),
    ).toBeNull();
  });

  it('builds circular menu model with required actions', () => {
    expect(
      buildStatementUploadMenuModel({
        googleDriveConnected: true,
        dropboxConnected: false,
        gmailConnected: false,
      }).map(item => item.id),
    ).toEqual(['scan', 'cloud-import', 'gmail', 'local-upload']);
  });

  it('keeps gmail action enabled when gmail is not connected', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: true,
      dropboxConnected: false,
      gmailConnected: false,
    });

    expect(model.find(item => item.id === 'gmail')).toMatchObject({
      label: 'Gmail',
      disabled: false,
    });
  });

  it('shows sync action when gmail is already connected', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: true,
      dropboxConnected: false,
      gmailConnected: true,
    });

    expect(model.find(item => item.id === 'gmail')).toMatchObject({
      label: 'Sync',
      disabled: false,
    });
  });

  it('uses create expense label for local action', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: true,
      dropboxConnected: false,
      gmailConnected: false,
    });

    expect(model.find(item => item.id === 'local-upload')?.label).toBe('Create expense');
  });

  it('uses cloud label and keeps cloud action enabled when not connected', () => {
    const model = buildStatementUploadMenuModel({
      googleDriveConnected: false,
      dropboxConnected: false,
      gmailConnected: false,
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
