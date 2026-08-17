/**
 * Chat-mode preference: when on, the app opens straight into /chat on launch.
 * Stored in localStorage — it is a per-device UI preference, not user data.
 */
const STORAGE_KEY = 'lumio-chat-mode';

export function isChatModePreferred(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setChatModePreferred(on: boolean): void {
  try {
    if (on) {
      window.localStorage.setItem(STORAGE_KEY, 'on');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode); the preference just won't stick.
  }
}
