import type { TourConfig } from './types';

/**
 * Admin Panel Tour
 */
export function createAdminTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    usersManagement: { title: string; description: string };
    workspacesOverview: { title: string; description: string };
    systemSettings: { title: string; description: string };
    monitoring: { title: string; description: string };
    auditLog: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'admin-tour',
    name: texts.name ?? 'Admin Panel Tour',
    description: texts.description ?? 'System management and monitoring',
    page: '/admin',
    autoStart: false,
    steps: [
      {
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.usersManagement.title,
        description: texts.steps.usersManagement.description,
        selector: '[data-tour-id="admin-users"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.workspacesOverview.title,
        description: texts.steps.workspacesOverview.description,
        selector: '[data-tour-id="admin-workspaces"]',
        side: 'right',
        align: 'center',
      },
      {
        title: texts.steps.systemSettings.title,
        description: texts.steps.systemSettings.description,
        selector: '[data-tour-id="admin-settings"]',
        side: 'right',
        align: 'center',
      },
      {
        title: texts.steps.monitoring.title,
        description: texts.steps.monitoring.description,
        selector: '[data-tour-id="admin-monitoring"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.auditLog.title,
        description: texts.steps.auditLog.description,
        selector: '[data-tour-id="admin-audit"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.completed.title,
        description: texts.steps.completed.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
    ],
  };
}
