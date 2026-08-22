// tinykeys v3 ships dist/tinykeys.d.ts but its package.json "exports" map
// omits a "types" condition, so TypeScript (moduleResolution: bundler) cannot
// resolve the shipped declarations. Mirror the published API surface here.
declare module 'tinykeys' {
  export type KeyBindingPress = [mods: string[], key: string | RegExp];

  export interface KeyBindingMap {
    [keybinding: string]: (event: KeyboardEvent) => void;
  }

  export interface KeyBindingHandlerOptions {
    /** Keybinding sequences will wait this long between key presses before cancelling (default: 1000). */
    timeout?: number;
  }

  export interface KeyBindingOptions extends KeyBindingHandlerOptions {
    /** Key presses will listen to this event (default: "keydown"). */
    event?: 'keydown' | 'keyup';
    /** Key presses will use a capture listener (default: false). */
    capture?: boolean;
  }

  export function parseKeybinding(str: string): KeyBindingPress[];
  export function matchKeyBindingPress(event: KeyboardEvent, [mods, key]: KeyBindingPress): boolean;
  export function createKeybindingsHandler(
    keyBindingMap: KeyBindingMap,
    options?: KeyBindingHandlerOptions,
  ): EventListener;
  export function tinykeys(
    target: Window | HTMLElement,
    keyBindingMap: KeyBindingMap,
    { event, capture, timeout }?: KeyBindingOptions,
  ): () => void;
}
