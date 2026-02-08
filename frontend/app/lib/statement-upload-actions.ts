export const STATEMENTS_OPEN_UPLOAD_MODAL_EVENT = 'statements:open-upload-modal';

export type ConnectedCloudProviders = {
  googleDriveConnected: boolean;
  dropboxConnected: boolean;
};

export type CloudImportProvider = 'google-drive' | 'dropbox';

export type StatementUploadMenuItem = {
  id: 'scan' | 'cloud-import' | 'local-upload';
  label: string;
  disabled?: boolean;
  provider?: CloudImportProvider;
};

export function resolveCloudImportProvider(
  providers: ConnectedCloudProviders,
): CloudImportProvider | null {
  if (providers.dropboxConnected) return 'dropbox';
  if (providers.googleDriveConnected) return 'google-drive';
  return null;
}

export function buildStatementUploadMenuModel(
  providers: ConnectedCloudProviders,
): StatementUploadMenuItem[] {
  const provider = resolveCloudImportProvider(providers);

  return [
    {
      id: 'scan',
      label: 'Scan',
    },
    {
      id: 'cloud-import',
      label:
        provider === 'dropbox'
          ? 'Import from Dropbox'
          : provider === 'google-drive'
            ? 'Import from Google Drive'
            : 'Cloud',
      disabled: false,
      provider: provider ?? undefined,
    },
    {
      id: 'local-upload',
      label: 'Create expense',
    },
  ];
}
