// Пока открыт любой оверлей (меню, поповер, диалог, календарь), Escape должен
// закрывать его, а не уводить со страницы. MUI размонтирует их после закрытия,
// поэтому достаточно проверить DOM.
const OVERLAY_SELECTOR =
  '.MuiPopover-root, .MuiDialog-root, .MuiModal-root, .MuiPickersPopper-root, [role="menu"], [role="listbox"]';

export const hasOpenOverlay = (): boolean =>
  typeof document !== 'undefined' && document.querySelector(OVERLAY_SELECTOR) !== null;

export const handleFullscreenEscapeNavigation = (
  event: Pick<KeyboardEvent, 'key' | 'defaultPrevented'>,
  onBackNavigation: () => void,
  isOverlayOpen: () => boolean = hasOpenOverlay,
): boolean => {
  if (event.key !== 'Escape' || event.defaultPrevented || isOverlayOpen()) {
    return false;
  }

  onBackNavigation();
  return true;
};
