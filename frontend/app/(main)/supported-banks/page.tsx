'use client';

import { Building2, CheckCircle2 } from 'lucide-react';
import { useIntlayer } from "@/app/i18n";
import Image from 'next/image';

type SupportedBankCard = {
  id: string;
  logo: string;
  name: string;
  notes: string;
};

export default function SupportedBanksPage() {
  const t = useIntlayer('supportedBanksPage' as any) as any;

  const getText = (value: unknown, fallback: string) => {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'value' in value) {
      const tokenValue = (value as { value?: string }).value;
      if (typeof tokenValue === 'string') {
        return tokenValue;
      }
    }

    return fallback;
  };

  const banks: SupportedBankCard[] = [
    {
      id: 'kaspi',
      logo: '/images/bank-logo/kaspi.png',
      name: getText(t?.banks?.kaspi?.name, 'Kaspi'),
      notes: getText(
        t?.banks?.kaspi?.notes,
        'Upload Kaspi PDF statements for automatic transaction extraction.',
      ),
    },
    {
      id: 'bereke',
      logo: '/images/bank-logo/bereke-bank.png',
      name: getText(t?.banks?.bereke?.name, 'Bereke'),
      notes: getText(
        t?.banks?.bereke?.notes,
        'Upload Bereke PDF statements for automatic transaction extraction.',
      ),
    },
  ];

  return (
    <div className="container-shared px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {getText(t?.title, 'Supported banks')}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {getText(
                t?.subtitle,
                'List of banks currently available for automatic statement parsing.',
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {getText(t?.parserStatus, 'Parser is active')}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {banks.map(bank => (
          <article
            key={bank.id}
            data-supported-bank={bank.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                <Image
                  src={bank.logo}
                  alt={bank.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{bank.name}</h2>
                <p className="text-sm text-gray-500">
                  {getText(t?.statusLabel, 'Status')}: {getText(t?.supported, 'Supported')}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium text-gray-800">
                {getText(t?.formatsLabel, 'Supported format')}:
              </span>
              {getText(t?.pdfStatements, 'PDF statements')}
            </div>

            <p className="mt-3 text-sm text-gray-600">{bank.notes}</p>
          </article>
        ))}
      </div>

      <p className="mt-6 text-sm font-medium text-gray-500">
        {getText(t?.comingSoon, 'More banks are coming soon')}
      </p>
    </div>
  );
}
