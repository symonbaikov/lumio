/**
 * Which engine chat mode should use when both are available. A per-device UI
 * preference, like the chat-mode flag next to it — the absence of a stored
 * value means "no choice made yet", and the page falls back to the cloud
 * provider when one is configured.
 */
export type ChatEngineChoice = 'cloud' | 'local';

const STORAGE_KEY = 'lumio-chat-engine';

export function getChatEnginePreference(): ChatEngineChoice | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'cloud' || stored === 'local' ? stored : null;
  } catch {
    return null;
  }
}

export function setChatEnginePreference(choice: ChatEngineChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage may be unavailable (private mode); the preference just won't stick.
  }
}
