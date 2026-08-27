/**
 * Declares Intlayer dictionary keys that are used as JSX intrinsic elements.
 *
 * Some components/tests render lowercase tags that collide with names in the
 * intlayer dictionary (e.g. <pdfPreviewModal />, <freshPdfThumbnail />). The
 * generated intlayer types do not declare these tags, so TypeScript falls back
 * to JSX.IntrinsicElements and fails. Augment the JSX namespaces so these tags
 * type-check while keeping them open to any props (the underlying components
 * are not real intrinsic elements).
 */

type IntlayerJsxTag = { children?: import('react').ReactNode } & Record<string, unknown>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      pdfPreviewModal: IntlayerJsxTag;
      freshPdfThumbnail: IntlayerJsxTag;
      pdfErrorAttachActions: IntlayerJsxTag;
      pdfLoadingOverlay: IntlayerJsxTag;
      pdfParsePrompt: IntlayerJsxTag;
      pdfImageView: IntlayerJsxTag;
      pdfPagesView: IntlayerJsxTag;
      pdfOverlays: IntlayerJsxTag;
      pdfViewerArea: IntlayerJsxTag;
      htmlLanguageSync: IntlayerJsxTag;
    }
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        pdfPreviewModal: IntlayerJsxTag;
        freshPdfThumbnail: IntlayerJsxTag;
        pdfErrorAttachActions: IntlayerJsxTag;
        pdfLoadingOverlay: IntlayerJsxTag;
        pdfParsePrompt: IntlayerJsxTag;
        pdfImageView: IntlayerJsxTag;
        pdfPagesView: IntlayerJsxTag;
        pdfOverlays: IntlayerJsxTag;
        pdfViewerArea: IntlayerJsxTag;
        htmlLanguageSync: IntlayerJsxTag;
      }
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      pdfPreviewModal: IntlayerJsxTag;
      freshPdfThumbnail: IntlayerJsxTag;
      pdfErrorAttachActions: IntlayerJsxTag;
      pdfLoadingOverlay: IntlayerJsxTag;
      pdfParsePrompt: IntlayerJsxTag;
      pdfImageView: IntlayerJsxTag;
      pdfPagesView: IntlayerJsxTag;
      pdfOverlays: IntlayerJsxTag;
      pdfViewerArea: IntlayerJsxTag;
      htmlLanguageSync: IntlayerJsxTag;
    }
  }
}

export {};
