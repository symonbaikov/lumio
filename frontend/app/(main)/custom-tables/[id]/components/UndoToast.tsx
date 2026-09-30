'use client';

import toast from 'react-hot-toast';

const UNDO_WINDOW_MS = 8000;

/** Success toast with an undo button that stays valid for a few seconds. */
export function showUndoToast(message: string, undoLabel: string, onUndo: () => void): void {
  let expired = false;
  const timeout = window.setTimeout(() => {
    expired = true;
  }, UNDO_WINDOW_MS);
  const id = toast.custom(
    current => (
      <div
        className={`lumio-ct__toast${current.visible ? '' : ' lumio-ct__toast--hidden'}`}
        role="status"
      >
        <span>{message}</span>
        <button
          type="button"
          className="lumio-ct__toast-undo"
          onClick={() => {
            if (expired) {
              return;
            }
            expired = true;
            window.clearTimeout(timeout);
            toast.dismiss(id);
            onUndo();
          }}
        >
          {undoLabel}
        </button>
      </div>
    ),
    { duration: UNDO_WINDOW_MS },
  );
}
