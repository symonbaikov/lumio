'use client';

import { X } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import type { ChangeEvent, ComponentType, RefObject } from 'react';

type TIntl = Record<string, { value: string }>;

type LoadingProps = { t: TIntl };
function PDFLoadingOverlay({ t }: LoadingProps): React.JSX.Element {
  return (
    <div className="lumio-pdf-preview-modal__loading-overlay">
      <div className="lumio-pdf-preview-modal__loading-body">
        <Spinner size={40} sx={{ display: 'block', mx: 'auto', mb: 2 }} />
        <p className="lumio-pdf-preview-modal__loading-text">{t.loading.value}</p>
      </div>
    </div>
  );
}

type ErrorActionsProps = {
  t: TIntl;
  onClose: () => void;
  attachingFile: boolean;
  attachInputRef: RefObject<HTMLInputElement | null>;
  onAttachClick: () => void;
  onAttachFile: (e: ChangeEvent<HTMLInputElement>) => void;
};
function PDFErrorAttachActions({
  t,
  onClose,
  attachingFile,
  attachInputRef,
  onAttachClick,
  onAttachFile,
}: ErrorActionsProps): React.JSX.Element {
  return (
    <div className="lumio-pdf-preview-modal__error-actions">
      <input
        ref={attachInputRef}
        type="file"
        accept="application/pdf,image/*,.csv,.xlsx,.xls,.docx"
        onChange={onAttachFile}
        className="lumio-pdf-preview-modal__hidden-input"
      />
      <button
        type="button"
        onClick={onAttachClick}
        disabled={attachingFile}
        className="lumio-pdf-preview-modal__btn-primary"
      >
        {attachingFile ? t.uploading.value : t.uploadFile.value}
      </button>
      <button type="button" onClick={onClose} className="lumio-pdf-preview-modal__btn-secondary">
        {t.close.value}
      </button>
    </div>
  );
}

type ErrorViewProps = {
  showAttachFallback: boolean;
  error: string;
  t: TIntl;
  onClose: () => void;
  attachingFile: boolean;
  attachInputRef: RefObject<HTMLInputElement | null>;
  onAttachClick: () => void;
  onAttachFile: (e: ChangeEvent<HTMLInputElement>) => void;
};
function PdfErrorView({
  showAttachFallback,
  error,
  t,
  onClose,
  attachingFile,
  attachInputRef,
  onAttachClick,
  onAttachFile,
}: ErrorViewProps): React.JSX.Element {
  return (
    <div className="lumio-pdf-preview-modal__error-overlay">
      <div className="lumio-pdf-preview-modal__error-body">
        <div className="lumio-pdf-preview-modal__error-icon-wrapper">
          <X size={24} style={{ color: 'var(--destructive)' }} strokeWidth={1.5} />
        </div>
        <h3 className="lumio-pdf-preview-modal__error-title">
          {showAttachFallback ? t.fileNotAttached.value : t.loadError.value}
        </h3>
        <p className="lumio-pdf-preview-modal__error-message">
          {showAttachFallback ? t.uploadFileHint.value : error}
        </p>
        {showAttachFallback ? (
          <PDFErrorAttachActions
            t={t}
            onClose={onClose}
            attachingFile={attachingFile}
            attachInputRef={attachInputRef}
            onAttachClick={onAttachClick}
            onAttachFile={onAttachFile}
          />
        ) : (
          <button type="button" onClick={onClose} className="lumio-pdf-preview-modal__btn-primary">
            {t.close.value}
          </button>
        )}
      </div>
    </div>
  );
}

type ParsePromptProps = {
  t: TIntl;
  startingParsing: boolean;
  onDecline: () => void;
  onConfirm: () => void;
};
function PDFParsePrompt({
  t,
  startingParsing,
  onDecline,
  onConfirm,
}: ParsePromptProps): React.JSX.Element {
  return (
    <div className="lumio-pdf-preview-modal__parse-prompt-overlay">
      <div className="lumio-pdf-preview-modal__parse-prompt-card">
        <h3 className="lumio-pdf-preview-modal__parse-prompt-title">{t.startParsing.value}</h3>
        <p className="lumio-pdf-preview-modal__parse-prompt-desc">
          {t.startParsingDescription.value}
        </p>
        <div className="lumio-pdf-preview-modal__parse-prompt-actions">
          <button
            type="button"
            onClick={onDecline}
            disabled={startingParsing}
            className="lumio-pdf-preview-modal__btn-secondary"
          >
            {t.decline.value}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={startingParsing}
            className="lumio-pdf-preview-modal__btn-accent"
          >
            {startingParsing ? t.startingParsing.value : t.startParsingButton.value}
          </button>
        </div>
      </div>
    </div>
  );
}

type OverlaysProps = {
  loading: boolean;
  error: string | null;
  showParsePrompt: boolean;
  showAttachFallback: boolean;
  t: TIntl;
  onClose: () => void;
  attachingFile: boolean;
  startingParsing: boolean;
  attachInputRef: RefObject<HTMLInputElement | null>;
  onAttachClick: () => void;
  onAttachFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onConfirmParse: () => void;
  onDeclineParse: () => void;
};
function PDFOverlays({
  loading,
  error,
  showParsePrompt,
  showAttachFallback,
  t,
  onClose,
  attachingFile,
  startingParsing,
  attachInputRef,
  onAttachClick,
  onAttachFile,
  onConfirmParse,
  onDeclineParse,
}: OverlaysProps): React.JSX.Element {
  return (
    <>
      {loading && <PDFLoadingOverlay t={t} />}
      {error && (
        <PdfErrorView
          showAttachFallback={showAttachFallback}
          error={error}
          t={t}
          onClose={onClose}
          attachingFile={attachingFile}
          attachInputRef={attachInputRef}
          onAttachClick={onAttachClick}
          onAttachFile={onAttachFile}
        />
      )}
      {showParsePrompt && (
        <PDFParsePrompt
          t={t}
          startingParsing={startingParsing}
          onDecline={onDeclineParse}
          onConfirm={onConfirmParse}
        />
      )}
    </>
  );
}

type ImageViewProps = {
  viewportRef: RefObject<HTMLDivElement | null>;
  pdfObjectUrl: string;
  fileName: string;
  isReceiptImage: boolean;
};
function PDFImageView({
  viewportRef,
  pdfObjectUrl,
  fileName,
  isReceiptImage,
}: ImageViewProps): React.JSX.Element {
  const cls = isReceiptImage
    ? 'lumio-pdf-preview-modal__image-preview lumio-pdf-preview-modal__image-preview--receipt'
    : 'lumio-pdf-preview-modal__image-preview';
  return (
    <div ref={viewportRef} className="lumio-pdf-preview-modal__viewport">
      <div className="lumio-pdf-preview-modal__page-wrapper">
        <img src={pdfObjectUrl} alt={fileName} className={cls} />
      </div>
    </div>
  );
}

type PdfPagesViewProps = {
  viewportRef: RefObject<HTMLDivElement | null>;
  pdfObjectUrl: string;
  pageWidth: number;
  numPages: number;
  DocumentComponent: ComponentType<Record<string, unknown>>;
  PageComponent: ComponentType<Record<string, unknown>>;
  onSetNumPages: (n: number) => void;
  onPdfError: () => void;
};
function PDFPagesView({
  viewportRef,
  pdfObjectUrl,
  pageWidth,
  numPages,
  DocumentComponent,
  PageComponent,
  onSetNumPages,
  onPdfError,
}: PdfPagesViewProps): React.JSX.Element {
  return (
    <div ref={viewportRef} className="lumio-pdf-preview-modal__viewport">
      <div className="lumio-pdf-preview-modal__pdf-wrapper">
        <DocumentComponent
          file={pdfObjectUrl}
          loading={null}
          onLoadSuccess={({ numPages: n }: { numPages: number }) => onSetNumPages(n)}
          onLoadError={onPdfError}
          style={{ width: '100%' }}
        >
          {[...Array(numPages).keys()].map(i => (
            <div key={`page_${i + 1}`} className="lumio-pdf-preview-modal__pdf-page-wrap">
              <PageComponent
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="lumio-pdf-preview-modal__pdf-page"
              />
            </div>
          ))}
        </DocumentComponent>
      </div>
    </div>
  );
}

type ViewerAreaProps = {
  showImage: boolean;
  showPDF: boolean;
  pdfObjectUrl: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  fileName: string;
  isReceiptImage: boolean;
  pageWidth: number;
  numPages: number;
  DocumentComponent: ComponentType<Record<string, unknown>> | undefined;
  PageComponent: ComponentType<Record<string, unknown>> | undefined;
  onSetNumPages: (n: number) => void;
  onPdfError: () => void;
};
function PDFViewerArea({
  showImage,
  showPDF,
  pdfObjectUrl,
  viewportRef,
  fileName,
  isReceiptImage,
  pageWidth,
  numPages,
  DocumentComponent,
  PageComponent,
  onSetNumPages,
  onPdfError,
}: ViewerAreaProps): React.JSX.Element {
  if (!pdfObjectUrl) return <></>;
  if (showImage)
    return (
      <PDFImageView
        viewportRef={viewportRef}
        pdfObjectUrl={pdfObjectUrl}
        fileName={fileName}
        isReceiptImage={isReceiptImage}
      />
    );
  if (!showPDF || !DocumentComponent || !PageComponent) return <></>;
  return (
    <PDFPagesView
      viewportRef={viewportRef}
      pdfObjectUrl={pdfObjectUrl}
      pageWidth={pageWidth}
      numPages={numPages}
      DocumentComponent={DocumentComponent}
      PageComponent={PageComponent}
      onSetNumPages={onSetNumPages}
      onPdfError={onPdfError}
    />
  );
}

export type PDFPreviewContentProps = {
  loading: boolean;
  error: string | null;
  pdfObjectUrl: string | null;
  fileContentType: string | null;
  showParsePrompt: boolean;
  attachingFile: boolean;
  startingParsing: boolean;
  showAttachFallback: boolean;
  isReceiptImage: boolean;
  pageWidth: number;
  numPages: number;
  DocumentComponent: ComponentType<Record<string, unknown>> | undefined;
  PageComponent: ComponentType<Record<string, unknown>> | undefined;
  viewportRef: RefObject<HTMLDivElement | null>;
  attachInputRef: RefObject<HTMLInputElement | null>;
  t: TIntl;
  fileName: string;
  onClose: () => void;
  onAttachClick: () => void;
  onAttachFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onConfirmParse: () => void;
  onDeclineParse: () => void;
  onSetNumPages: (n: number) => void;
  onPdfError: () => void;
};

export function PDFPreviewContent({
  loading,
  error,
  pdfObjectUrl,
  fileContentType,
  showParsePrompt,
  attachingFile,
  startingParsing,
  showAttachFallback,
  isReceiptImage,
  pageWidth,
  numPages,
  DocumentComponent,
  PageComponent,
  viewportRef,
  attachInputRef,
  t,
  fileName,
  onClose,
  onAttachClick,
  onAttachFile,
  onConfirmParse,
  onDeclineParse,
  onSetNumPages,
  onPdfError,
}: PDFPreviewContentProps): React.JSX.Element {
  const isImagePreview = Boolean(fileContentType?.startsWith('image/'));
  const showImage = !error && Boolean(pdfObjectUrl) && isImagePreview;
  const showPdf = !error && Boolean(pdfObjectUrl) && !isImagePreview;
  return (
    <div className="lumio-pdf-preview-modal__content">
      <PDFOverlays
        loading={loading}
        error={error}
        showParsePrompt={showParsePrompt}
        showAttachFallback={showAttachFallback}
        t={t}
        onClose={onClose}
        attachingFile={attachingFile}
        startingParsing={startingParsing}
        attachInputRef={attachInputRef}
        onAttachClick={onAttachClick}
        onAttachFile={onAttachFile}
        onConfirmParse={onConfirmParse}
        onDeclineParse={onDeclineParse}
      />
      <PDFViewerArea
        showImage={showImage}
        showPDF={showPdf}
        pdfObjectUrl={pdfObjectUrl}
        viewportRef={viewportRef}
        fileName={fileName}
        isReceiptImage={isReceiptImage}
        pageWidth={pageWidth}
        numPages={numPages}
        DocumentComponent={DocumentComponent}
        PageComponent={PageComponent}
        onSetNumPages={onSetNumPages}
        onPdfError={onPdfError}
      />
    </div>
  );
}
