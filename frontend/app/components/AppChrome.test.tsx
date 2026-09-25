import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppChrome from './AppChrome';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('./Sidebar', () => {
  const SidebarContent = () => <nav aria-label="Main navigation" />;
  return {
    default: () => (
      <aside>
        <SidebarContent />
      </aside>
    ),
    SidebarContent,
  };
});

describe('AppChrome', () => {
  it('renders the navigation once, without an off-screen copy in the Tab order', () => {
    render(<AppChrome />);

    expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(1);
  });
});
