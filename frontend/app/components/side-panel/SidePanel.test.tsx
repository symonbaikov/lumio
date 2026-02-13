// @vitest-environment jsdom
import { Pencil, ThumbsUp } from 'lucide-react';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SidePanel } from './SidePanel';
import { SidePanelProvider } from './SidePanelContext';
import type { SidePanelPageConfig } from './types';

const config: SidePanelPageConfig = {
  pageId: 'test-side-panel',
  sections: [
    {
      id: 'todo',
      type: 'navigation',
      items: [
        {
          id: 'submit',
          label: 'Submit',
          icon: Pencil,
        },
        {
          id: 'approve',
          label: 'Approve',
          icon: ThumbsUp,
          active: true,
        },
      ],
    },
  ],
};

describe('SidePanel navigation styles', () => {
  it('renders active item icon in primary color without icon or row background fills', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidePanelProvider>
          <SidePanel config={config} showCollapseToggle={false} />
        </SidePanelProvider>,
      );
    });

    const activeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Approve'),
    );

    expect(activeButton).toBeTruthy();
    expect(activeButton?.className).not.toContain('bg-[#ede8e1]');

    const activeIconWrapper = activeButton?.querySelector('span.h-9.w-9') as HTMLSpanElement | null;
    expect(activeIconWrapper).toBeTruthy();
    expect(activeIconWrapper?.className).toContain('text-primary');
    expect(activeIconWrapper?.className).not.toContain('bg-white');
    expect(activeIconWrapper?.className).not.toContain('bg-gray-100');
  });
});
