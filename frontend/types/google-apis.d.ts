export {};

declare global {
  interface GooglePickerView {
    setIncludeFolders(value: boolean): GooglePickerView;
    setSelectFolderEnabled(value: boolean): GooglePickerView;
    setMimeTypes(value: string): GooglePickerView;
  }

  interface GooglePickerBuilder<TDoc = unknown> {
    setDeveloperKey(value: string): GooglePickerBuilder<TDoc>;
    setOAuthToken(value: string): GooglePickerBuilder<TDoc>;
    enableFeature(value: string): GooglePickerBuilder<TDoc>;
    addView(view: GooglePickerView): GooglePickerBuilder<TDoc>;
    setCallback(
      callback: (data: { action: string; docs?: TDoc[] }) => void,
    ): GooglePickerBuilder<TDoc>;
    build(): { setVisible(value: boolean): void };
  }

  interface WindowGooglePicker {
    DocsView: new (viewId: string) => GooglePickerView;
    PickerBuilder: new <TDoc = unknown>() => GooglePickerBuilder<TDoc>;
    ViewId: {
      SPREADSHEETS: string;
      DOCS: string;
      FOLDERS: string;
    };
    Action: {
      PICKED: string;
      CANCEL: string;
    };
    Feature: {
      MULTISELECT_ENABLED: string;
    };
  }

  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void }) => void;
    };
    google?: {
      picker?: WindowGooglePicker;
    };
  }
}
