export const handleFullscreenEscapeNavigation = (
  key: string,
  onBackNavigation: () => void,
): boolean => {
  if (key !== 'Escape') {
    return false;
  }

  onBackNavigation();
  return true;
};
