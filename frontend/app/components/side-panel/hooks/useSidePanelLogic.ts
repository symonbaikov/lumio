import { useCallback, useMemo, useState } from 'react';
import type { SidePanelProps, SidePanelSection, SidePanelWidth } from '../types';
import { getWidthValue } from '../types';

type SectionFilter = {
  sections: SidePanelSection[];
  enabledSections?: string[];
  permissions?: SidePanelProps['permissions'];
  hasPermission: (p: string) => boolean;
};
function applySectionFilter({
  sections,
  enabledSections,
  permissions,
  hasPermission,
}: SectionFilter): SidePanelSection[] {
  return sections.filter(s => {
    if (enabledSections && !enabledSections.includes(s.id)) return false;
    const req = permissions?.sections?.[s.id];
    return !req || req.every(p => hasPermission(p));
  });
}

interface SidePanelLogic {
  isCollapsed: boolean;
  handleToggle: () => void;
  position: string;
  widthValue: string | number;
  filteredSections: SidePanelSection[];
  canView: boolean;
}

type Params = {
  props: SidePanelProps;
  hasPermission: (p: string) => boolean;
  contextWidth: string;
  contextPosition: string;
};

export function useSidePanelLogic({
  props,
  hasPermission,
  contextWidth,
  contextPosition,
}: Params): SidePanelLogic {
  const {
    width: propWidth,
    position: propPosition,
    defaultCollapsed,
    collapsed: ctrl,
    onCollapsedChange,
    enabledSections,
    permissions,
    config,
  } = props;
  const width = propWidth ?? contextWidth;
  const position = propPosition ?? contextPosition;
  const isControlled = ctrl !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultCollapsed === true);
  const isCollapsed = isControlled ? (ctrl as boolean) : uncontrolled;
  const handleToggle = useCallback((): void => {
    if (isControlled) {
      onCollapsedChange?.(!ctrl);
    } else {
      setUncontrolled(p => !p);
    }
  }, [isControlled, ctrl, onCollapsedChange]);
  const widthValue = useMemo(
    (): string | number => getWidthValue(width as SidePanelWidth),
    [width],
  );
  const rawSections = config?.sections;
  const filteredSections = useMemo((): SidePanelSection[] => {
    const sections = rawSections ?? [];
    return applySectionFilter({ sections, enabledSections, permissions, hasPermission });
  }, [rawSections, enabledSections, permissions, hasPermission]);
  const viewPerms = permissions?.viewPanel;
  const canView = useMemo(
    (): boolean => !viewPerms || viewPerms.every(p => hasPermission(p)),
    [viewPerms, hasPermission],
  );
  return { isCollapsed, handleToggle, position, widthValue, filteredSections, canView };
}
