'use client';

import { useMemo } from 'react';
import { Trash2 } from '@/app/components/icons';
import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useIntlayer } from '@/app/i18n';
import { resolveLabel } from '@/app/lib/side-panel-utils';

type Props = {
  trashCount: number | null;
};

export default function TrashSidePanel({ trashCount }: Props) {
  const t = useIntlayer('statementsPage');
  const root = t as unknown as Record<string, unknown>;
  const trash = (root.trash as Record<string, unknown> | undefined) ?? {};
  const trashTitle = resolveLabel(trash.title, 'Trash');

  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: 'statements-trash',
      sections: [
        {
          id: 'trash',
          type: 'navigation',
          items: [
            {
              id: 'trash',
              label: trashTitle,
              icon: Trash2,
              badge: trashCount ?? 0,
              badgeLoading: trashCount === null,
              badgeVariant: 'default',
              active: true,
              href: '/statements/trash',
            },
          ],
        },
      ],
    }),
    [trashTitle, trashCount],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
