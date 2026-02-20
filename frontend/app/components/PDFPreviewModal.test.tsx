import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFPreviewModal } from './PDFPreviewModal';

vi.mock('@/app/lib/workspace-headers', () => ({
  getWorkspaceHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

vi.mock('react-pdf', () => ({
  pdfjs: {
    version: '1.0.0',
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
  Document: () => null,
  Page: () => null,
}));

vi.mock('./ui/modal-shell', () => ({
  ModalShell: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

describe('PDFPreviewModal manual attach flow', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob://preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows upload CTA in error state for manual statement placeholder', async () => {
    await act(async () => {
      root.render(
        <PDFPreviewModal
          isOpen
          onClose={vi.fn()}
          fileId="statement-1"
          fileName="manual-expense.csv"
          allowAttachFile
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Загрузить файл');
  });

  it('offers parsing prompt after successful file attach and starts replace parsing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'statement-1' }) })
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'statement-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        <PDFPreviewModal
          isOpen
          onClose={vi.fn()}
          fileId="statement-1"
          fileName="manual-expense.csv"
          allowAttachFile
        />,
      );
      await Promise.resolve();
    });

    const uploadInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(uploadInput).toBeTruthy();

    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    await act(async () => {
      Object.defineProperty(uploadInput, 'files', {
        value: [file],
        configurable: true,
      });
      uploadInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Запустить парсинг');

    const startParsingButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Запустить парсинг'),
    ) as HTMLButtonElement;

    await act(async () => {
      startParsingButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/statements/statement-1/reprocess?mode=replace',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
