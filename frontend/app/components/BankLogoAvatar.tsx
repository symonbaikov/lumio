'use client';

import { resolveBankLogo } from '@bank-logos';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import React from 'react';

type Props = {
  bankName?: string | null;
  size?: number;
  className?: string;
  rounded?: boolean;
};

export function BankLogoAvatar({ bankName, size = 32, className, rounded = true }: Props) {
  const resolved = resolveBankLogo(bankName);
  const [imageError, setImageError] = React.useState(false);
  const shouldShowImage = resolved.key !== 'other' && !imageError;

  if (shouldShowImage) {
    return (
      <img
        src={resolved.src}
        alt={bankName || resolved.displayName || 'Bank'}
        width={size}
        height={size}
        className={[
          rounded ? 'rounded-full' : 'rounded-lg',
          'bg-gray-100 object-contain',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center justify-center text-gray-500',
        rounded ? 'rounded-full' : 'rounded-lg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
      aria-label={bankName || resolved.displayName || 'Bank'}
      title={bankName || resolved.displayName || 'Bank'}
    >
      <AccountBalanceIcon
        data-testid="bank-logo-fallback-icon"
        sx={{ fontSize: Math.max(14, Math.round(size * 0.9)) }}
      />
    </span>
  );
}
