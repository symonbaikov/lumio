'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { cn } from '@/app/lib/utils';
import { Check, User } from 'lucide-react';

type FilterAvatarRowProps = {
  label: string;
  description?: string | null;
  selected: boolean;
  onClick: () => void;
  avatarUrl?: string | null;
  bankName?: string | null;
  className?: string;
};

export function FilterAvatarRow({
  label,
  description,
  selected,
  onClick,
  avatarUrl,
  bankName,
  className,
}: FilterAvatarRowProps) {
  const fallbackLetter = label.trim().charAt(0).toUpperCase() || 'U';

  const resolvedAvatarUrl = normalizeAvatarUrl(avatarUrl);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-gray-50',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {bankName ? (
          <BankLogoAvatar bankName={bankName} size={32} />
        ) : resolvedAvatarUrl ? (
          <img src={resolvedAvatarUrl} alt={label} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
            {fallbackLetter || <User className="h-4 w-4" />}
          </div>
        )}
        <div>
          <div className="text-base font-semibold text-gray-900">{label}</div>
          {description ? <div className="text-sm text-gray-500">{description}</div> : null}
        </div>
      </div>
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md',
          selected ? 'bg-primary text-white' : 'bg-gray-100 text-transparent',
        )}
      >
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}
