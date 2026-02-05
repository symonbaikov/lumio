// Main Components
export { SidePanel } from './SidePanel';
export { SidePanelProvider, useSidePanel, useSidePanelOptional } from './SidePanelContext';

// Hooks
export { useSidePanelConfig, useCurrentSidePanelConfig } from './hooks/useSidePanelConfig';

// Section Renderers (for custom implementations)
export {
  SectionRenderer,
  NavigationSectionRenderer,
  StatusSectionRenderer,
  SummarySectionRenderer,
  MetricsSectionRenderer,
  ActionsSectionRenderer,
  SettingsSectionRenderer,
  ErrorSectionRenderer,
  ChartSectionRenderer,
  CustomSectionRenderer,
} from './sections';

// Page Configuration Factories
export { createBasicSidePanelConfig } from './configs';

// Example Components
export {
  PageWithSidePanel,
  AppLayoutWithSidePanel,
} from './examples/SidePanelPageLayout';

// Types
export type {
  // Core types
  SidePanelWidth,
  SidePanelPosition,
  SidePanelSectionType,
  // Item types
  NavigationItem,
  StatusItem,
  SummaryItem,
  ActionItem,
  SettingsToggleItem,
  SettingsSelectItem,
  ErrorItem,
  ChartItem,
  // Section types
  SidePanelSectionBase,
  NavigationSection,
  StatusSection,
  SummarySection,
  MetricsSection,
  ActionsSection,
  SettingsSection,
  ErrorSection,
  ChartSection,
  CustomSection,
  SidePanelSection,
  // Configuration types
  SidePanelPermissions,
  SidePanelPageConfig,
  SidePanelProps,
  // Context types
  SidePanelContextState,
  SidePanelProviderProps,
} from './types';

// Utility exports
export {
  WIDTH_VALUES,
  getWidthValue,
  STATUS_COLORS,
  BADGE_VARIANTS,
  ACTION_VARIANTS,
} from './types';
