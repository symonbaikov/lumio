declare module 'emoji-button' {
  export interface EmojiSelection {
    emoji: string;
  }

  export interface EmojiButtonOptions {
    theme?: 'light' | 'dark' | 'auto';
  }

  export class EmojiButton {
    constructor(options?: EmojiButtonOptions);
    on(event: 'emoji', callback: (selection: EmojiSelection) => void): void;
    off?(event: 'emoji', callback: (selection: EmojiSelection) => void): void;
    togglePicker(reference: HTMLElement): void;
  }
}
