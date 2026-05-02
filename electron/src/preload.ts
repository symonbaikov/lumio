import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lumioDesktop', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  showNotification: (title: string, body: string): void => {
    ipcRenderer.send('show-notification', { title, body });
  },
  checkForUpdates: (): void => {
    ipcRenderer.send('check-for-updates');
  },
  resizeForOnboardingIntegration: (): Promise<boolean> =>
    ipcRenderer.invoke('resize-for-onboarding-integration'),
});
