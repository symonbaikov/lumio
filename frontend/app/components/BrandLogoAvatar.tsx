'use client';

import React from 'react';

import { getReceiptLogoUrl } from '../lib/brand-logo';

type Props = {
  sender: string;
  vendorName?: string;
  size?: number;
};

const extractLocalPart = (sender: string): string => {
  if (!sender) {
    return '';
  }

  const emailMatch = sender.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch?.[0]) {
    return emailMatch[0].split('@')[0] ?? '';
  }

  if (sender.includes('@')) {
    return sender.split('@')[0] ?? '';
  }

  return sender;
};

const getInitials = (label: string): string => {
  const cleaned = label.replace(/[^a-z0-9\s]+/gi, ' ').trim();

  if (!cleaned) {
    return 'NA';
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
};

export function BrandLogoAvatar({ sender, vendorName, size = 32 }: Props) {
  const [imageError, setImageError] = React.useState(false);
  const logoUrl = getReceiptLogoUrl(sender);
  const fallbackSource = vendorName ?? extractLocalPart(sender);
  const initials = getInitials(fallbackSource);

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={vendorName || 'Brand'}
        width={size}
        height={size}
        className="rounded-xl object-contain bg-white border border-slate-100"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-xs shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      aria-label={vendorName || 'Brand'}
      title={vendorName || 'Brand'}
    >
      {initials}
    </span>
  );
}
