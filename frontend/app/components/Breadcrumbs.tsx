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
    <nav className="mb-4 flex items-center text-sm text-gray-600" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isSamePageLink = !!item.href && item.href === pathname;
        return (
          <div key={`${item.href ?? 'crumb'}-${idx}`} className="flex items-center">
            {item.href && !isLast && !isSamePageLink ? (
              <Link href={item.href} className="text-primary hover:underline">
                {item.label}
              </Link>
            ) : item.href && !isLast && isSamePageLink ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => router.refresh()}
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />}
          </div>
        );
      })}
    </nav>
  );
}
