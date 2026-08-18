'use client';

import { Check, ChevronDown, Plus } from '@/app/components/icons';
import { useMenuClickOutside } from '@/app/components/pdf-preview/hooks/useMenuClickOutside';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { buildNavItems, isNavItemActive } from './navigation/helpers/navigation-config';

function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const switcherRef = useMenuClickOutside({ menuOpen: open, onClose: close });

  if (!currentWorkspace) return null;

  const initials = (currentWorkspace.name ?? '?').slice(0, 1).toUpperCase();
  const color = currentWorkspace.color ?? '#168118';
  const role = currentWorkspace.memberRole;

  return (
    <div
      ref={switcherRef}
      className="lumio-sidebar__ws-switcher"
      onClick={() => setOpen(prev => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(prev => !prev); }}
      aria-expanded={open}
    >
      <div className="lumio-sidebar__ws-chip" style={{ background: color }}>
        {initials}
      </div>
      <div className="lumio-sidebar__ws-info">
        <div className="lumio-sidebar__ws-name">{currentWorkspace.name}</div>
        {role && <div className="lumio-sidebar__ws-role">{role}</div>}
      </div>
      <ChevronDown
        size={14}
        className={`lumio-sidebar__ws-chevron${open ? ' lumio-sidebar__ws-chevron--open' : ''}`}
      />

      {open && (
        <div
          className="lumio-sidebar__ws-dropdown"
          onClick={e => e.stopPropagation()}
          role="menu"
        >
          <div className="lumio-sidebar__ws-dropdown-label">Switch workspace</div>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              type="button"
              className={`lumio-sidebar__ws-item${ws.id === currentWorkspace.id ? ' lumio-sidebar__ws-item--active' : ''}`}
              onClick={() => { void switchWorkspace(ws.id); setOpen(false); }}
              role="menuitem"
            >
              <div
                className="lumio-sidebar__ws-chip"
                style={{ background: ws.color ?? '#168118' }}
              >
                {(ws.name ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <span className="lumio-sidebar__ws-item-name">{ws.name}</span>
              {ws.id === currentWorkspace.id && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type SidebarProps = {
  onNavClick?: () => void;
};

export function SidebarContent({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { nav, supportProject } = useIntlayer('navigation');

  const navItems = buildNavItems(nav as Parameters<typeof buildNavItems>[0]);
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <>
      {/* Brand */}
      <Link href="/" className="lumio-sidebar__brand" onClick={onNavClick} aria-label="Lumio home">
        <div className="lumio-sidebar__brand-name">LUMIO</div>
      </Link>

      {/* Workspace switcher */}
      <WorkspaceSwitcher />

      {/* CTA */}
      <Link
        href="/statements?upload=1"
        className="lumio-sidebar__cta"
        onClick={onNavClick}
      >
        <span className="lumio-sidebar__cta-icon">
          <Plus size={12} />
        </span>
        <span>New statement</span>
        <span className="lumio-sidebar__kbd">⌘ N</span>
      </Link>

      {/* Navigation */}
      <nav className="lumio-sidebar__nav" aria-label="Main navigation">
        <div className="lumio-sidebar__section-label">Workspace</div>
        {visibleNavItems.map(item => {
          const active = isNavItemActive(pathname ?? '', item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`lumio-sidebar__nav-item${active ? ' lumio-sidebar__nav-item--active' : ''}`}
              onClick={onNavClick}
            >
              <span className="lumio-sidebar__nav-icon">{item.icon}</span>
              <span className="lumio-sidebar__nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="lumio-sidebar__footer">
        <a
          href="https://github.com/sponsors/symonbaikov"
          target="_blank"
          rel="noopener noreferrer"
          className="lumio-sidebar__support-link"
        >
          <span className="lumio-sidebar__support-icon">💚</span>
          {(supportProject as { value?: string })?.value ?? 'Support the project'}
        </a>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="lumio-shell__sidebar">
      <SidebarContent />
    </aside>
  );
}
