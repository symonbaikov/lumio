import type { TourConfig } from './types';

/**
 * Advanced Workspace Settings Tour
 */
export function createSettingsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    members: { title: string; description: string };
    memberCard: { title: string; description: string };
    inviteForm: { title: string; description: string };
    inviteEmail: { title: string; description: string };
    roles: { title: string; description: string };
    permissions: { title: string; description: string };
    sendInvite: { title: string; description: string };
    inviteLink: { title: string; description: string };
    pendingInvitations: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'settings-tour',
    name: texts.name ?? 'Workspace Settings Tour',
    description: texts.description ?? 'Team and access management',
    page: '/settings/workspace',
    autoStart: true,
    steps: [
      {
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.members.title,
        description: texts.steps.members.description,
        selector: '[data-tour-id="members-card"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.memberCard.title,
        description: texts.steps.memberCard.description,
        selector: '[data-tour-id="member-card"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.inviteForm.title,
        description: texts.steps.inviteForm.description,
        selector: '[data-tour-id="invite-card"]',
        side: 'left',
        align: 'start',
      },
      {
        title: texts.steps.inviteEmail.title,
        description: texts.steps.inviteEmail.description,
        selector: '[data-tour-id="invite-email-field"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.roles.title,
        description: texts.steps.roles.description,
        selector: '[data-tour-id="role-selection"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.permissions.title,
        description: texts.steps.permissions.description,
        selector: '[data-tour-id="permissions-section"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.sendInvite.title,
        description: texts.steps.sendInvite.description,
        selector: '[data-tour-id="send-invite-button"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.inviteLink.title,
        description: texts.steps.inviteLink.description,
        selector: '[data-tour-id="invite-link-alert"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.pendingInvitations.title,
        description: texts.steps.pendingInvitations.description,
        selector: '[data-tour-id="pending-invitations-card"]',
        side: 'top',
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
