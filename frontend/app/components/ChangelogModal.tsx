'use client';

import { X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { ModalShell } from './ui/modal-shell';

export interface ChangelogEntry {
  id: string;
  title: string;
  summary: string;
  markdown: string;
  date: string;
  version?: string;
  branch?: string;
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ChangelogEntry | null;
  releaseLabel: string;
  closeLabel: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 text-3xl font-semibold leading-tight text-[#0f3428]">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 text-2xl font-semibold leading-tight text-[#0f3428]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-xl font-semibold leading-tight text-[#0f3428]">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 text-[#2f4a3f]">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2 pl-6 text-[#2f4a3f]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2 pl-6 text-[#2f4a3f]">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#17352b]">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-[#edf3ed] px-1.5 py-0.5 text-[13px] text-[#1a4638]">
      {children}
    </code>
  ),
};

export function ChangelogModal({
  isOpen,
  onClose,
  entry,
  releaseLabel,
  closeLabel,
}: ChangelogModalProps) {
  if (!entry) {
    return null;
  }

  const formattedDate = new Date(entry.date).toLocaleString();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-none overflow-hidden rounded-[22px] border border-[#d4e3d6] shadow-[0_24px_80px_rgba(16,24,40,0.16)]"
      contentClassName="!h-full !p-0"
    >
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-[#e4e6e3] px-5 py-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f7a73]">
              {releaseLabel}
            </p>
            <h2 className="text-2xl font-semibold leading-tight text-[#0f3428]">{entry.title}</h2>
            <p className="text-sm text-[#607168]">{formattedDate}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#9aa39e] transition-colors hover:bg-[#eef2ee] hover:text-[#6f7773]"
            aria-label={closeLabel}
          >
            <X size={30} strokeWidth={2.4} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f4] px-5 py-7">
          <article className="mx-auto w-full max-w-4xl rounded-[20px] border border-[#dde5dd] bg-white px-6 py-6 text-[15px] leading-7 text-[#17352b] sm:px-8 sm:py-8">
            <div className="changelog-markdown">
              <ReactMarkdown components={markdownComponents}>{entry.markdown}</ReactMarkdown>
            </div>
          </article>
        </div>
      </div>
    </ModalShell>
  );
}
