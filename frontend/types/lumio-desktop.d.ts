interface LumioDesktopAPI {
  /** Whether the app is running inside the Electron desktop client */
  isDesktop: boolean;
  /** Operating system: 'darwin' | 'win32' | 'linux' */
  platform: string;
  /** Returns the Electron app version */
  getAppVersion: () => Promise<string>;
  /** Show a native OS notification */
  showNotification: (title: string, body: string) => void;
  /** Trigger a manual check for app updates */
  checkForUpdates: () => void;
  /** Resize the desktop window for onboarding integration setup */
  resizeForOnboardingIntegration: () => Promise<boolean>;
}

interface Window {
  lumioDesktop?: LumioDesktopAPI;
}
