'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  return (
    <nav className="w-full overflow-x-auto" aria-label="Breadcrumb">
      <ol className="m-0 inline-flex min-w-max list-none items-center gap-1 rounded-[var(--radius-sm)] bg-muted/70 pb-2 pl-0 pr-3 pt-2 text-sm">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isSamePageLink = !!item.href && item.href === pathname;
          const itemPaddingClass = idx === 0 ? 'pb-0.5 pl-0 pr-1.5 pt-0.5' : 'px-1.5 py-0.5';
          return (
            <li key={`${item.href ?? 'crumb'}-${idx}`} className="inline-flex items-center gap-1">
              {item.href && !isLast && !isSamePageLink ? (
                <Link
                  href={item.href}
                  className={`rounded-[calc(var(--radius-sm)-2px)] ${itemPaddingClass} text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
                >
                  {item.label}
                </Link>
              ) : item.href && !isLast && isSamePageLink ? (
                <button
                  type="button"
                  className={`rounded-[calc(var(--radius-sm)-2px)] ${itemPaddingClass} text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
                  onClick={() => router.refresh()}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast
                      ? `rounded-[calc(var(--radius-sm)-2px)] ${itemPaddingClass} font-medium text-foreground`
                      : `rounded-[calc(var(--radius-sm)-2px)] ${itemPaddingClass} text-muted-foreground`
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/80" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
