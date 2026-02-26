'use client';

import { AppPagination } from '@/app/components/ui/pagination';
import { useAuth } from '@/app/hooks/useAuth';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import apiClient from '@/app/lib/api';
import { DatePicker } from '@heroui/date-picker';
import { Icon } from '@iconify/react';
import { parseDate } from '@internationalized/date';
import { format } from 'date-fns';
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Droplets,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Table,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';

type BaseTabKey = 'cash' | 'raw' | 'debit' | 'credit';
type CustomFieldTabKey = `field:${string}`;
type TabKey = BaseTabKey | 'custom' | CustomFieldTabKey;

interface FormState {
  date: string;
  amount: string;
  note: string;
  currency: string;
  customFieldName: string;
  customFieldIcon: string;
  customFieldValue: string;
}

interface Entry {
  id: string;
  date: string;
  amount: number;
  note: string;
  currency?: string;
  customFieldName?: string | null;
  customFieldIcon?: string | null;
  customFieldValue?: string | null;
}

type CustomField = {
  id: string;
  name: string;
  icon: string | null;
  entriesCount?: number;
};

type DataEntryTableLink = {
  id: string;
  name: string;
  dataEntryScope?: 'type' | 'all' | null;
  dataEntryType?: BaseTabKey | null;
  dataEntryCustomTabId?: string | null;
  dataEntrySyncedAt?: string | null;
};

const initialForm: FormState = {
  date: '',
  amount: '',
  note: '',
  currency: 'KZT',
  customFieldName: '',
  customFieldIcon: 'mdi:tag',
  customFieldValue: '',
};

const CUSTOM_FIELD_ICONS = [
  'mdi:tag',
  'mdi:briefcase',
  'mdi:account',
  'mdi:account-group',
  'mdi:cash',
  'mdi:shopping',
  'mdi:warehouse',
  'mdi:truck',
  'mdi:office-building',
  'mdi:home',
  'mdi:chart-line',
  'mdi:file-document-outline',
  'mdi:calendar',
  'mdi:star',
];

const PAGE_SIZE = 20;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);
  return debouncedValue;
}

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateValue = (value: string) => {
  if (!value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
};

const toCalendarDate = (value: string) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return null;
  }

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

export default function DataEntryPage() {
  const router = useRouter();
  const t = useIntlayer('dataEntryPage');
  const { locale } = useLocale();
  const { user, loading } = useAuth();
  const customFieldRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('cash');
  const [forms, setForms] = useState<Record<string, FormState>>({
    cash: { ...initialForm },
    raw: { ...initialForm },
    debit: { ...initialForm },
    credit: { ...initialForm },
  });
  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const [listQueryByTab, setListQueryByTab] = useState<Record<string, string>>({});
  const [listDateByTab, setListDateByTab] = useState<Record<string, string>>({});
  const [listPageByTab, setListPageByTab] = useState<Record<string, number>>({});
  const [listMetaByTab, setListMetaByTab] = useState<
    Record<string, { total: number; page: number; limit: number }>
  >({});
  const listRequestSeq = useRef(0);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [hiddenBaseTabs, setHiddenBaseTabs] = useState<BaseTabKey[]>([]);
  const [dataEntryTables, setDataEntryTables] = useState<DataEntryTableLink[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [creatingCustomField, setCreatingCustomField] = useState(false);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldIcon, setNewCustomFieldIcon] = useState('mdi:tag');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldIcon, setEditFieldIcon] = useState('mdi:tag');
  const [editingBaseTab, setEditingBaseTab] = useState<BaseTabKey | null>(null);
  const [baseTabOverrides, setBaseTabOverrides] = useState<
    Partial<Record<BaseTabKey, { label: string }>>
  >({});
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editIconOpen, setEditIconOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<
    | { open: false }
    | {
        open: true;
        kind: 'custom';
        id: string;
        name: string;
        entriesCount: number;
      }
    | {
        open: true;
        kind: 'base';
        id: BaseTabKey;
        name: string;
        entriesCount: number;
      }
  >({ open: false });
  const [deletingTab, setDeletingTab] = useState(false);
  const [exportingTabToTable, setExportingTabToTable] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useLockBodyScroll(deleteDialog.open);
  useLockBodyScroll(currencyModalOpen);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [listCalendarOpen, setListCalendarOpen] = useState(false);
  const [customIconOpen, setCustomIconOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingTable, setExportingTable] = useState(false);
  const [syncingTable, setSyncingTable] = useState(false);
  const [customFieldHighlight, setCustomFieldHighlight] = useState(false);
  const allCurrencies = [
    { value: 'KZT', label: 'Казахстанский тенге (KZT)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'RUB', label: 'Российский рубль (RUB)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
    { value: 'CNY', label: 'Chinese Yuan (CNY)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' },
    { value: 'SGD', label: 'Singapore Dollar (SGD)' },
    { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
    { value: 'NZD', label: 'New Zealand Dollar (NZD)' },
    { value: 'SEK', label: 'Swedish Krona (SEK)' },
    { value: 'NOK', label: 'Norwegian Krone (NOK)' },
    { value: 'DKK', label: 'Danish Krone (DKK)' },
    { value: 'PLN', label: 'Polish Złoty (PLN)' },
    { value: 'CZK', label: 'Czech Koruna (CZK)' },
    { value: 'HUF', label: 'Hungarian Forint (HUF)' },
    { value: 'RON', label: 'Romanian Leu (RON)' },
    { value: 'BGN', label: 'Bulgarian Lev (BGN)' },
    { value: 'HRK', label: 'Croatian Kuna (HRK)' },
    { value: 'RSD', label: 'Serbian Dinar (RSD)' },
    { value: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
    { value: 'BYN', label: 'Belarusian Ruble (BYN)' },
    { value: 'GEL', label: 'Georgian Lari (GEL)' },
    { value: 'AMD', label: 'Armenian Dram (AMD)' },
    { value: 'AZN', label: 'Azerbaijani Manat (AZN)' },
    { value: 'UZS', label: 'Uzbekistani Som (UZS)' },
    { value: 'KGS', label: 'Kyrgyzstani Som (KGS)' },
    { value: 'TJS', label: 'Tajikistani Somoni (TJS)' },
    { value: 'MNT', label: 'Mongolian Tugrik (MNT)' },
    { value: 'KRW', label: 'South Korean Won (KRW)' },
    { value: 'TWD', label: 'New Taiwan Dollar (TWD)' },
    { value: 'THB', label: 'Thai Baht (THB)' },
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
    { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
    { value: 'PHP', label: 'Philippine Peso (PHP)' },
    { value: 'VND', label: 'Vietnamese Dong (VND)' },
    { value: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
    { value: 'BDT', label: 'Bangladeshi Taka (BDT)' },
    { value: 'NPR', label: 'Nepalese Rupee (NPR)' },
    { value: 'PKR', label: 'Pakistani Rupee (PKR)' },
    { value: 'AFN', label: 'Afghan Afghani (AFN)' },
    { value: 'KWD', label: 'Kuwaiti Dinar (KWD)' },
    { value: 'BHD', label: 'Bahraini Dinar (BHD)' },
    { value: 'QAR', label: 'Qatari Riyal (QAR)' },
    { value: 'SAR', label: 'Saudi Riyal (SAR)' },
    { value: 'AED', label: 'UAE Dirham (AED)' },
    { value: 'OMR', label: 'Omani Rial (OMR)' },
    { value: 'JOD', label: 'Jordanian Dinar (JOD)' },
    { value: 'LBP', label: 'Lebanese Pound (LBP)' },
    { value: 'EGP', label: 'Egyptian Pound (EGP)' },
    { value: 'ILS', label: 'Israeli Shekel (ILS)' },
    { value: 'TRY', label: 'Turkish Lira (TRY)' },
    { value: 'IRR', label: 'Iranian Rial (IRR)' },
    { value: 'IQD', label: 'Iraqi Dinar (IQD)' },
    { value: 'LYD', label: 'Libyan Dinar (LYD)' },
    { value: 'TND', label: 'Tunisian Dinar (TND)' },
    { value: 'DZD', label: 'Algerian Dinar (DZD)' },
    { value: 'MAD', label: 'Moroccan Dirham (MAD)' },
    { value: 'NGN', label: 'Nigerian Naira (NGN)' },
    { value: 'GHS', label: 'Ghanaian Cedi (GHS)' },
    { value: 'XOF', label: 'West African CFA (XOF)' },
    { value: 'XAF', label: 'Central African CFA (XAF)' },
    { value: 'XPF', label: 'CFP Franc (XPF)' },
    { value: 'ZAR', label: 'South African Rand (ZAR)' },
    { value: 'BWP', label: 'Botswana Pula (BWP)' },
    { value: 'NAD', label: 'Namibian Dollar (NAD)' },
    { value: 'SZL', label: 'Eswatini Lilangeni (SZL)' },
    { value: 'LSL', label: 'Lesotho Loti (LSL)' },
    { value: 'MGA', label: 'Malagasy Ariary (MGA)' },
    { value: 'MUR', label: 'Mauritian Rupee (MUR)' },
    { value: 'SCR', label: 'Seychellois Rupee (SCR)' },
    { value: 'KES', label: 'Kenyan Shilling (KES)' },
    { value: 'UGX', label: 'Ugandan Shilling (UGX)' },
    { value: 'TZS', label: 'Tanzanian Shilling (TZS)' },
    { value: 'RWF', label: 'Rwandan Franc (RWF)' },
    { value: 'BIF', label: 'Burundian Franc (BIF)' },
    { value: 'DJF', label: 'Djiboutian Franc (DJF)' },
    { value: 'ERN', label: 'Eritrean Nakfa (ERN)' },
    { value: 'ETB', label: 'Ethiopian Birr (ETB)' },
    { value: 'SOS', label: 'Somali Shilling (SOS)' },
    { value: 'SSP', label: 'South Sudanese Pound (SSP)' },
    { value: 'GMD', label: 'Gambian Dalasi (GMD)' },
    { value: 'GNF', label: 'Guinean Franc (GNF)' },
    { value: 'LRD', label: 'Liberian Dollar (LRD)' },
    { value: 'SLL', label: 'Sierra Leonean Leone (SLL)' },
    { value: 'SDG', label: 'Sudanese Pound (SDG)' },
    { value: 'CUP', label: 'Cuban Peso (CUP)' },
    { value: 'HTG', label: 'Haitian Gourde (HTG)' },
    { value: 'JMD', label: 'Jamaican Dollar (JMD)' },
    { value: 'BBD', label: 'Barbadian Dollar (BBD)' },
    { value: 'TTD', label: 'Trinidad & Tobago Dollar (TTD)' },
    { value: 'XCD', label: 'East Caribbean Dollar (XCD)' },
    { value: 'BZD', label: 'Belize Dollar (BZD)' },
    { value: 'GTQ', label: 'Guatemalan Quetzal (GTQ)' },
    { value: 'HNL', label: 'Honduran Lempira (HNL)' },
    { value: 'NIO', label: 'Nicaraguan Córdoba (NIO)' },
    { value: 'CRC', label: 'Costa Rican Colón (CRC)' },
    { value: 'PAB', label: 'Panamanian Balboa (PAB)' },
    { value: 'COP', label: 'Colombian Peso (COP)' },
    { value: 'VES', label: 'Venezuelan Bolívar (VES)' },
    { value: 'BOB', label: 'Bolivian Boliviano (BOB)' },
    { value: 'PYG', label: 'Paraguayan Guaraní (PYG)' },
    { value: 'UYU', label: 'Uruguayan Peso (UYU)' },
    { value: 'CLP', label: 'Chilean Peso (CLP)' },
    { value: 'PEN', label: 'Peruvian Sol (PEN)' },
    { value: 'ARS', label: 'Argentine Peso (ARS)' },
    { value: 'BRL', label: 'Brazilian Real (BRL)' },
    { value: 'GYD', label: 'Guyana Dollar (GYD)' },
    { value: 'SRD', label: 'Surinamese Dollar (SRD)' },
    { value: 'AWG', label: 'Aruban Florin (AWG)' },
    { value: 'ANG', label: 'Netherlands Antillean Guilder (ANG)' },
    { value: 'CUC', label: 'Cuban Convertible Peso (CUC)' },
    { value: 'MXN', label: 'Mexican Peso (MXN)' },
  ];

  const currencies = useMemo(() => {
    const popularCurrencies = [
      'KZT',
      'USD',
      'EUR',
      'RUB',
      'GBP',
      'JPY',
      'CNY',
      'CHF',
      'CAD',
      'AUD',
    ];

    return [
      ...allCurrencies.filter(currency => popularCurrencies.includes(currency.value)),
      { value: 'separator', label: '─────────────────', isDisabled: true },
      ...allCurrencies.filter(currency => !popularCurrencies.includes(currency.value)),
    ];
  }, []);

  const tabMeta: Record<
    BaseTabKey | 'custom',
    { label: string; icon: ReactNode; description: string }
  > = useMemo(
    () => ({
      cash: {
        label: t.tabs.cash.label.value,
        icon: <DollarSign className="h-4 w-4" />,
        description: t.tabs.cash.description.value,
      },
      raw: {
        label: t.tabs.raw.label.value,
        icon: <ClipboardList className="h-4 w-4" />,
        description: t.tabs.raw.description.value,
      },
      debit: {
        label: t.tabs.debit.label.value,
        icon: <TrendingUp className="h-4 w-4" />,
        description: t.tabs.debit.description.value,
      },
      credit: {
        label: t.tabs.credit.label.value,
        icon: <TrendingDown className="h-4 w-4" />,
        description: t.tabs.credit.description.value,
      },
      custom: {
        label: t.tabs.custom.label.value,
        icon: <Plus className="h-4 w-4" />,
        description: t.tabs.custom.description.value,
      },
    }),
    [t],
  );

  const handleChange = (tab: TabKey, field: keyof FormState, value: string) => {
    setForms(prev => ({
      ...prev,
      [tab]: {
        ...(prev[tab] || { ...initialForm }),
        [field]: value,
      },
    }));
  };

  const handleSubmit = (tab: TabKey) => {
    const payload = forms[tab] || initialForm;
    if (tab === 'custom') {
      setStatus({
        type: 'error',
        message: t.errors.useColumnCreationForTab.value,
      });
      return;
    }
    if (!payload.date || !payload.amount) {
      setStatus({ type: 'error', message: t.errors.fillDateAndAmount.value });
      return;
    }

    const amountNum = Number(payload.amount);
    if (Number.isNaN(amountNum)) {
      setStatus({ type: 'error', message: t.errors.amountMustBeNumber.value });
      return;
    }

    setSaving(true);
    setError(null);
    const isFieldTabValue = tab.startsWith('field:');
    const fieldId = isFieldTabValue ? tab.slice('field:'.length) : null;
    const field = fieldId ? customFields.find(f => f.id === fieldId) || null : null;
    const submitType: BaseTabKey = isFieldTabValue ? 'cash' : (tab as BaseTabKey);
    apiClient
      .post('/data-entry', {
        type: submitType,
        ...(isFieldTabValue && fieldId ? { customTabId: fieldId } : {}),
        date: payload.date,
        amount: amountNum,
        note: payload.note || undefined,
        currency: payload.currency || 'KZT',
      })
      .then(resp => {
        const savedRaw: Entry = resp.data?.data || resp.data;
        const amountNumSafe = Number((savedRaw as any)?.amount);
        const saved: Entry = {
          ...savedRaw,
          amount: Number.isNaN(amountNumSafe) ? 0 : amountNumSafe,
          currency: savedRaw?.currency || 'KZT',
        };
        if (isFieldTab(tab)) {
          const fieldId = getFieldId(tab);
          setCustomFields(prev =>
            prev.map(f =>
              f.id === fieldId ? { ...f, entriesCount: Number(f.entriesCount || 0) + 1 } : f,
            ),
          );
        }
        setForms(prev => ({
          ...prev,
          [tab]: {
            ...initialForm,
            customFieldName: '',
            customFieldIcon: initialForm.customFieldIcon,
          },
        }));
        setStatus({ type: 'success', message: t.status.dataSaved.value });
        toast.success(t.status.entrySaved.value);

        // Reload list (page 1) so pagination/search remain correct.
        const query = (listQueryByTab[tab] ?? '').trim();
        const date = (listDateByTab[tab] ?? '').trim();
        setPageForTab(tab, 1);
        if (isBaseTab(tab)) {
          loadEntries(tab, { page: 1, query, date });
        } else if (isFieldTab(tab)) {
          const fieldId = getFieldId(tab);
          loadCustomTabEntries(fieldId, tab, { page: 1, query, date });
        }
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.saveFailed.value;
        setStatus({ type: 'error', message });
        toast.error(message);
      })
      .finally(() => setSaving(false));
  };

  useEffect(() => {
    if (isFieldTab(activeTab)) {
      const fieldId = getFieldId(activeTab);
      const field = customFields.find(f => f.id === fieldId);
      setEditingFieldId(field?.id || null);
      setEditingBaseTab(null);
      setEditFieldName(field?.name || '');
      setEditFieldIcon(field?.icon || 'mdi:tag');
      return;
    }
    if (isBaseTab(activeTab)) {
      setEditingFieldId(null);
      setEditingBaseTab(activeTab);
      setEditFieldName(baseTabOverrides[activeTab]?.label || tabMeta[activeTab].label);
      setEditPanelOpen(false);
      setEditIconOpen(false);
      return;
    }
    setEditingFieldId(null);
    setEditingBaseTab(null);
    setEditPanelOpen(false);
    setEditIconOpen(false);
  }, [activeTab, baseTabOverrides, customFields, tabMeta]);

  const currentForm = forms[activeTab] || initialForm;
  const currentMeta = tabMeta[activeTab as BaseTabKey] || tabMeta.custom;
  const currentEntries = entries[activeTab] || [];
  const activeQuery = listQueryByTab[activeTab] ?? '';
  const activeDate = listDateByTab[activeTab] ?? '';
  const activePage = listPageByTab[activeTab] ?? 1;
  const debouncedActiveQuery = useDebouncedValue(activeQuery, 250);
  const activeListMeta = listMetaByTab[activeTab];
  const effectiveListMeta = useMemo(
    () =>
      activeListMeta || {
        total: currentEntries.length,
        page: activePage,
        limit: PAGE_SIZE,
      },
    [activeListMeta, activePage, currentEntries.length],
  );
  const effectiveTotalPages = Math.max(
    1,
    Math.ceil((effectiveListMeta.total || 0) / (effectiveListMeta.limit || PAGE_SIZE)),
  );
  const effectiveStartIndex =
    effectiveListMeta.total <= 0 ? 0 : (effectiveListMeta.page - 1) * effectiveListMeta.limit + 1;
  const effectiveEndIndex =
    effectiveListMeta.total <= 0
      ? 0
      : Math.min(effectiveListMeta.page * effectiveListMeta.limit, effectiveListMeta.total);
  const showPagination = Boolean(activeListMeta) && effectiveListMeta.total > 0;

  const isBaseTab = (tab: TabKey): tab is BaseTabKey =>
    tab === 'cash' || tab === 'raw' || tab === 'debit' || tab === 'credit';
  const isFieldTab = (tab: TabKey): tab is CustomFieldTabKey => tab.startsWith('field:');
  const getFieldId = (tab: CustomFieldTabKey) => tab.slice('field:'.length);

  const visibleBaseTabs = useMemo(
    () =>
      (['cash', 'raw', 'debit', 'credit'] as BaseTabKey[]).filter(
        tab => !hiddenBaseTabs.includes(tab),
      ),
    [hiddenBaseTabs],
  );

  const resolveFallbackTab = useMemo((): TabKey => {
    if (visibleBaseTabs.length > 0) return visibleBaseTabs[0];
    if (customFields.length > 0) return `field:${customFields[0].id}` as CustomFieldTabKey;
    return 'custom';
  }, [customFields, visibleBaseTabs]);

  const setQueryForTab = (tab: TabKey, query: string) => {
    setListQueryByTab(prev => ({ ...prev, [tab]: query }));
    setListPageByTab(prev => ({ ...prev, [tab]: 1 }));
  };

  const setDateForTab = (tab: TabKey, date: string) => {
    setListDateByTab(prev => ({ ...prev, [tab]: date }));
    setListPageByTab(prev => ({ ...prev, [tab]: 1 }));
  };

  const setPageForTab = (tab: TabKey, page: number) => {
    setListPageByTab(prev => ({ ...prev, [tab]: Math.max(1, page) }));
  };

  const getTabLabel = (tab: TabKey): string => {
    if (isBaseTab(tab)) return baseTabOverrides[tab]?.label || tabMeta[tab].label;
    if (tab === 'custom') return tabMeta.custom.label;
    const fieldId = getFieldId(tab);
    const field = customFields.find(f => f.id === fieldId);
    return field?.name || t.tabs.custom.label.value;
  };

  const getTabIcon = (tab: TabKey): ReactNode => {
    if (isBaseTab(tab)) return tabMeta[tab].icon;
    if (tab === 'custom') return tabMeta.custom.icon;
    const fieldId = getFieldId(tab);
    const field = customFields.find(f => f.id === fieldId);
    return renderIconPreview(field?.icon || 'mdi:tag', 'h-4 w-4') || null;
  };

  const linkedTable = useMemo(() => {
    if (isBaseTab(activeTab)) {
      return dataEntryTables.find(
        table => table.dataEntryScope === 'type' && table.dataEntryType === activeTab,
      );
    }
    if (isFieldTab(activeTab)) {
      const fieldId = getFieldId(activeTab);
      return dataEntryTables.find(table => table.dataEntryCustomTabId === fieldId);
    }
    return null;
  }, [activeTab, dataEntryTables]);

  const renderIconPreview = (icon: string, className?: string) => {
    if (!icon) return null;
    if (icon.startsWith('http')) {
      return (
        <img src={icon} alt={t.labels.iconAlt.value} className={`h-5 w-5 ${className || ''}`} />
      );
    }
    if (icon.startsWith('/uploads')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const baseUrl = apiUrl.replace('/api/v1', '');
      const fullUrl = baseUrl + icon;
      return (
        <img src={fullUrl} alt={t.labels.iconAlt.value} className={`h-5 w-5 ${className || ''}`} />
      );
    }
    return <Icon icon={icon} className={`h-5 w-5 ${className || ''}`} />;
  };

  const formatDate = (value: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(resolveLocale(locale));
    } catch {
      return value;
    }
  };

  const loadEntries = (
    tab: BaseTabKey,
    opts?: { page?: number; query?: string; date?: string },
  ) => {
    setLoadingList(true);
    setError(null);
    const requestId = ++listRequestSeq.current;
    const page = Math.max(opts?.page ?? 1, 1);
    const query = (opts?.query ?? '').trim();
    const date = (opts?.date ?? '').trim();
    apiClient
      .get('/data-entry', {
        params: {
          type: tab,
          limit: PAGE_SIZE,
          page,
          q: query || undefined,
          date: date || undefined,
        },
      })
      .then(resp => {
        if (requestId !== listRequestSeq.current) return;
        const payload = resp.data?.data || resp.data;
        const rawItems: Entry[] = payload?.items || payload?.data?.items || payload?.data || [];
        const items = rawItems.map(item => {
          const amountNum = Number((item as any)?.amount);
          return {
            ...item,
            amount: Number.isNaN(amountNum) ? 0 : amountNum,
            currency: (item as any)?.currency || 'KZT',
          };
        });
        const totalRaw = payload?.total ?? payload?.data?.total;
        const limitRaw = payload?.limit ?? payload?.data?.limit ?? PAGE_SIZE;
        const pageRaw = payload?.page ?? payload?.data?.page ?? page;
        setEntries(prev => ({
          ...prev,
          [tab]: items,
        }));
        setListMetaByTab(prev => ({
          ...prev,
          [tab]: {
            total: typeof totalRaw === 'number' ? totalRaw : items.length,
            limit: typeof limitRaw === 'number' ? limitRaw : PAGE_SIZE,
            page: typeof pageRaw === 'number' ? pageRaw : page,
          },
        }));
      })
      .catch(err => {
        if (requestId !== listRequestSeq.current) return;
        const message = err?.response?.data?.message || t.errors.loadEntriesFailed.value;
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (requestId === listRequestSeq.current) setLoadingList(false);
      });
  };

  const loadCustomTabEntries = (
    customTabId: string,
    tabKey: CustomFieldTabKey,
    opts?: { page?: number; query?: string; date?: string },
  ) => {
    setLoadingList(true);
    setError(null);
    const requestId = ++listRequestSeq.current;
    const page = Math.max(opts?.page ?? 1, 1);
    const query = (opts?.query ?? '').trim();
    const date = (opts?.date ?? '').trim();
    apiClient
      .get('/data-entry', {
        params: {
          customTabId,
          limit: PAGE_SIZE,
          page,
          q: query || undefined,
          date: date || undefined,
        },
      })
      .then(resp => {
        if (requestId !== listRequestSeq.current) return;
        const payload = resp.data?.data || resp.data;
        const rawItems: Entry[] = payload?.items || payload?.data?.items || payload?.data || [];
        const items = rawItems.map(item => {
          const amountNum = Number((item as any)?.amount);
          return {
            ...item,
            amount: Number.isNaN(amountNum) ? 0 : amountNum,
            currency: (item as any)?.currency || 'KZT',
          };
        });
        const totalRaw = payload?.total ?? payload?.data?.total;
        const limitRaw = payload?.limit ?? payload?.data?.limit ?? PAGE_SIZE;
        const pageRaw = payload?.page ?? payload?.data?.page ?? page;
        setEntries(prev => ({
          ...prev,
          [tabKey]: items,
        }));
        setListMetaByTab(prev => ({
          ...prev,
          [tabKey]: {
            total: typeof totalRaw === 'number' ? totalRaw : items.length,
            limit: typeof limitRaw === 'number' ? limitRaw : PAGE_SIZE,
            page: typeof pageRaw === 'number' ? pageRaw : page,
          },
        }));
      })
      .catch(err => {
        if (requestId !== listRequestSeq.current) return;
        const message = err?.response?.data?.message || t.errors.loadEntriesFailed.value;
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (requestId === listRequestSeq.current) setLoadingList(false);
      });
  };

  const loadCustomFields = () => {
    setLoadingCustomFields(true);
    setError(null);
    apiClient
      .get('/data-entry/custom-fields')
      .then(resp => {
        const payload = resp.data?.data || resp.data;
        const items = (payload?.items || []) as CustomField[];
        setCustomFields(items);

        const hidden = payload?.hiddenBaseTabs;
        if (Array.isArray(hidden)) {
          setHiddenBaseTabs(hidden as BaseTabKey[]);
        }
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.loadCustomColumnsFailed.value;
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoadingCustomFields(false));
  };

  useEffect(() => {
    if (isBaseTab(activeTab) && hiddenBaseTabs.includes(activeTab)) {
      setActiveTab(resolveFallbackTab);
    }
  }, [activeTab, hiddenBaseTabs, resolveFallbackTab]);

  const loadDataEntryTables = () => {
    apiClient
      .get('/custom-tables')
      .then(resp => {
        const payload = resp.data?.items || resp.data?.data?.items || resp.data?.data || [];
        const items = Array.isArray(payload) ? payload : [];
        const linked = items.filter(
          (table: DataEntryTableLink) => table.dataEntryScope || table.dataEntryCustomTabId,
        );
        setDataEntryTables(linked);
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.loadTablesFailed.value;
        setError(message);
        toast.error(message);
      });
  };

  const createCustomField = () => {
    const name = newCustomFieldName.trim();
    if (!name) {
      setStatus({ type: 'error', message: t.errors.columnNameRequired.value });
      return;
    }
    setCreatingCustomField(true);
    setError(null);
    apiClient
      .post('/data-entry/custom-fields', {
        name,
        icon: newCustomFieldIcon?.trim() || undefined,
      })
      .then(resp => {
        const createdRaw: CustomField = resp.data?.data || resp.data;
        const created: CustomField = { ...createdRaw, entriesCount: 0 };
        setCustomFields(prev => {
          const next = [...prev, created].sort((a, b) =>
            a.name.localeCompare(b.name, resolveLocale(locale)),
          );
          return next;
        });
        setActiveTab(`field:${created.id}`);
        setNewCustomFieldName('');
        setStatus({ type: 'success', message: t.status.columnCreated.value });
        toast.success(t.status.columnCreatedToast.value);
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.createColumnFailed.value;
        setStatus({ type: 'error', message });
        toast.error(message);
      })
      .finally(() => setCreatingCustomField(false));
  };

  const saveCustomFieldEdit = async () => {
    if (!editingFieldId) return;
    const name = editFieldName.trim();
    if (!name) {
      setStatus({ type: 'error', message: t.errors.columnNameRequired.value });
      return;
    }

    setSavingEdit(true);
    setStatus(null);
    setError(null);
    try {
      const resp = await apiClient.patch(`/data-entry/custom-fields/${editingFieldId}`, {
        name,
        icon: editFieldIcon?.trim() || undefined,
      });
      const updatedRaw: CustomField = resp.data?.data || resp.data;
      setCustomFields(prev =>
        prev.map(field =>
          field.id === editingFieldId
            ? {
                ...field,
                name: updatedRaw?.name || name,
                icon: updatedRaw?.icon ?? editFieldIcon,
              }
            : field,
        ),
      );
      setStatus({ type: 'success', message: t.status.columnUpdated.value });
      toast.success(t.status.columnUpdated.value);
      setEditPanelOpen(false);
      setEditIconOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.updateColumnFailed.value;
      setStatus({ type: 'error', message });
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const saveTabEdit = async () => {
    if (editingBaseTab) {
      const name = editFieldName.trim();
      if (!name) {
        setStatus({
          type: 'error',
          message: t.errors.columnNameRequired.value,
        });
        return;
      }
      setSavingEdit(true);
      setStatus(null);
      setError(null);
      setBaseTabOverrides(prev => ({
        ...prev,
        [editingBaseTab]: { label: name },
      }));
      setStatus({ type: 'success', message: t.status.columnUpdated.value });
      toast.success(t.status.columnUpdated.value);
      setEditPanelOpen(false);
      setEditIconOpen(false);
      setSavingEdit(false);
      return;
    }
    await saveCustomFieldEdit();
  };

  const removeCustomField = (id: string) => {
    setError(null);
    apiClient
      .delete(`/data-entry/custom-fields/${id}`)
      .then(() => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
        if (activeTab === `field:${id}`) {
          setActiveTab('cash');
        }
        setEntries(prev => {
          const next = { ...prev };
          delete next[`field:${id}`];
          return next;
        });
        setStatus({ type: 'success', message: t.status.columnDeleted.value });
        toast.success(t.status.columnDeleted.value);
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.deleteColumnFailed.value;
        setStatus({ type: 'error', message });
        toast.error(message);
      });
  };

  const openDeleteDialog = (field: CustomField) => {
    setDeleteDialog({
      open: true,
      kind: 'custom',
      id: field.id,
      name: field.name,
      entriesCount: Number(field.entriesCount || 0),
    });
  };

  const openDeleteDialogForBaseTab = async (tab: BaseTabKey) => {
    setStatus(null);
    setError(null);

    // Fast-path: if we already have meta for this tab, use it.
    const cachedTotal = listMetaByTab[tab]?.total;
    if (typeof cachedTotal === 'number') {
      setDeleteDialog({
        open: true,
        kind: 'base',
        id: tab,
        name: getTabLabel(tab),
        entriesCount: cachedTotal,
      });
      return;
    }

    // Otherwise query total count from API.
    setDeleteDialog({
      open: true,
      kind: 'base',
      id: tab,
      name: getTabLabel(tab),
      entriesCount: 0,
    });
    try {
      const resp = await apiClient.get('/data-entry', {
        params: { type: tab, limit: 1, page: 1 },
      });
      const payload = resp.data?.data || resp.data;
      const totalRaw = payload?.total ?? payload?.data?.total;
      const total = typeof totalRaw === 'number' ? totalRaw : 0;
      setDeleteDialog(prev => {
        if (!prev.open || prev.kind !== 'base' || prev.id !== tab) return prev;
        return { ...prev, entriesCount: total };
      });
    } catch {
      // Ignore count fetch errors; dialog still works.
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false });
    setDeletingTab(false);
    setExportingTabToTable(false);
  };

  const exportTabToCustomTableAndDelete = async () => {
    if (!deleteDialog.open) return;
    setExportingTabToTable(true);
    setStatus(null);
    setError(null);
    try {
      if (deleteDialog.kind === 'custom') {
        const resp = await apiClient.post('/custom-tables/from-data-entry-custom-tab', {
          customTabId: deleteDialog.id,
          name: deleteDialog.name,
        });
        const payload = resp.data?.data || resp.data;
        const tableId = payload?.tableId;
        if (!tableId) throw new Error('tableId missing');
        await apiClient.delete(`/data-entry/custom-fields/${deleteDialog.id}`);
        setCustomFields(prev => prev.filter(f => f.id !== deleteDialog.id));
        setEntries(prev => {
          const next = { ...prev };
          delete next[`field:${deleteDialog.id}`];
          return next;
        });
        if (activeTab === (`field:${deleteDialog.id}` as TabKey)) setActiveTab(resolveFallbackTab);
        closeDeleteDialog();
        router.push(`/custom-tables/${tableId}`);
      } else {
        const resp = await apiClient.post('/custom-tables/from-data-entry', {
          scope: 'type',
          type: deleteDialog.id,
        });
        const payload = resp.data?.data || resp.data;
        const tableId = payload?.tableId;
        if (!tableId) throw new Error('tableId missing');
        await apiClient.delete(`/data-entry/base-tabs/${deleteDialog.id}`);
        setHiddenBaseTabs(prev =>
          prev.includes(deleteDialog.id) ? prev : [...prev, deleteDialog.id],
        );
        setEntries(prev => {
          const next = { ...prev };
          delete next[deleteDialog.id];
          return next;
        });
        if (activeTab === deleteDialog.id) setActiveTab(resolveFallbackTab);
        closeDeleteDialog();
        router.push(`/custom-tables/${tableId}`);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.copyToTableFailed.value;
      setStatus({ type: 'error', message });
    } finally {
      setExportingTabToTable(false);
    }
  };

  const deleteTabOnly = async () => {
    if (!deleteDialog.open) return;
    setDeletingTab(true);
    setStatus(null);
    setError(null);
    try {
      if (deleteDialog.kind === 'custom') {
        await apiClient.delete(`/data-entry/custom-fields/${deleteDialog.id}`);
        setCustomFields(prev => prev.filter(f => f.id !== deleteDialog.id));
        setEntries(prev => {
          const next = { ...prev };
          delete next[`field:${deleteDialog.id}`];
          return next;
        });
        if (activeTab === (`field:${deleteDialog.id}` as TabKey)) setActiveTab(resolveFallbackTab);
      } else {
        await apiClient.delete(`/data-entry/base-tabs/${deleteDialog.id}`);
        setHiddenBaseTabs(prev =>
          prev.includes(deleteDialog.id) ? prev : [...prev, deleteDialog.id],
        );
        setEntries(prev => {
          const next = { ...prev };
          delete next[deleteDialog.id];
          return next;
        });
        if (activeTab === deleteDialog.id) setActiveTab(resolveFallbackTab);
      }
      closeDeleteDialog();
      setStatus({ type: 'success', message: t.status.tabDeleted.value });
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.deleteTabFailed.value;
      setStatus({ type: 'error', message });
    } finally {
      setDeletingTab(false);
    }
  };

  const triggerIconUpload = () => {
    iconInputRef.current?.click();
  };

  const handleIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    setStatus(null);
    setError(null);
    const formData = new FormData();
    formData.append('icon', file);
    try {
      const resp = await apiClient.post('/data-entry/custom-fields/icon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = resp.data?.url || resp.data?.data?.url;
      if (url) {
        setNewCustomFieldIcon(url);
      } else {
        throw new Error('URL missing');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.uploadIconFailed.value;
      setStatus({ type: 'error', message });
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const syncDataEntryTable = async (tableId: string) => {
    if (!user) return;
    setSyncingTable(true);
    setExportMenuOpen(false);
    setCustomIconOpen(false);
    setCalendarOpen(false);
    setError(null);
    setStatus(null);
    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/sync-from-data-entry`);
      const payload = response.data?.data || response.data;
      const rowsCreated = payload?.rowsCreated;
      setStatus({
        type: 'success',
        message:
          typeof rowsCreated === 'number'
            ? `${t.status.syncedWithRowsPrefix.value}${rowsCreated}${t.status.syncedWithRowsSuffix.value}`
            : t.status.synced.value,
      });
      const syncedAt = payload?.syncedAt || payload?.dataEntrySyncedAt;
      if (syncedAt) {
        setDataEntryTables(prev =>
          prev.map(table =>
            table.id === tableId ? { ...table, dataEntrySyncedAt: syncedAt } : table,
          ),
        );
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.syncFailed.value;
      setStatus({ type: 'error', message });
    } finally {
      setSyncingTable(false);
    }
  };

  const createTableFromDataEntry = async (scope: 'type' | 'all') => {
    if (!user) return;
    setExportingTable(true);
    setExportMenuOpen(false);
    setCustomIconOpen(false);
    setCalendarOpen(false);
    setError(null);
    setStatus(null);
    try {
      if (scope === 'type' && isFieldTab(activeTab)) {
        const response = await apiClient.post('/custom-tables/from-data-entry-custom-tab', {
          customTabId: getFieldId(activeTab),
          name: getTabLabel(activeTab),
        });
        const payload = response.data?.data || response.data;
        const tableId = payload?.tableId;
        if (!tableId) {
          throw new Error('tableId missing');
        }
        router.push(`/custom-tables/${tableId}`);
      } else {
        const response = await apiClient.post('/custom-tables/from-data-entry', {
          scope,
          type: scope === 'type' ? (isBaseTab(activeTab) ? activeTab : 'cash') : undefined,
        });
        const payload = response.data?.data || response.data;
        const tableId = payload?.tableId;
        if (!tableId) {
          throw new Error('tableId missing');
        }
        router.push(`/custom-tables/${tableId}`);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.createTableFailed.value;
      setStatus({ type: 'error', message });
    } finally {
      setExportingTable(false);
    }
  };

  // Load on tab change
  useEffect(() => {
    if (!user) return;
    if (isBaseTab(activeTab)) {
      loadEntries(activeTab, {
        page: activePage,
        query: debouncedActiveQuery,
        date: activeDate,
      });
      return;
    }
    if (isFieldTab(activeTab)) {
      const id = getFieldId(activeTab);
      loadCustomTabEntries(id, activeTab, {
        page: activePage,
        query: debouncedActiveQuery,
        date: activeDate,
      });
    }
  }, [activeTab, user, activePage, debouncedActiveQuery, activeDate]);

  useEffect(() => {
    if (!user) return;
    loadCustomFields();
    loadDataEntryTables();
  }, [user]);

  const handleDelete = (entryId: string) => {
    setRemovingId(entryId);
    if (!isBaseTab(activeTab) && !isFieldTab(activeTab)) return;
    const effectiveTab = activeTab;
    apiClient
      .delete(`/data-entry/${entryId}`)
      .then(() => {
        setEntries(prev => ({
          ...prev,
          [effectiveTab]: (prev[effectiveTab] || []).filter(e => e.id !== entryId),
        }));
        if (isFieldTab(effectiveTab)) {
          const fieldId = getFieldId(effectiveTab);
          setCustomFields(prev =>
            prev.map(f =>
              f.id === fieldId
                ? {
                    ...f,
                    entriesCount: Math.max(0, Number(f.entriesCount || 0) - 1),
                  }
                : f,
            ),
          );
        }
        setStatus({ type: 'success', message: t.status.entryDeleted.value });

        const query = (listQueryByTab[effectiveTab] ?? '').trim();
        const date = (listDateByTab[effectiveTab] ?? '').trim();
        const page = listPageByTab[effectiveTab] ?? 1;
        if (isBaseTab(effectiveTab)) {
          loadEntries(effectiveTab, { page, query, date });
        } else if (isFieldTab(effectiveTab)) {
          loadCustomTabEntries(getFieldId(effectiveTab), effectiveTab, {
            page,
            query,
            date,
          });
        }
      })
      .catch(err => {
        const message = err?.response?.data?.message || t.errors.deleteEntryFailed.value;
        setStatus({ type: 'error', message });
      })
      .finally(() => setRemovingId(null));
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.labels.loading}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-gray-800 font-semibold mb-2">{t.labels.signInTitle}</p>
          <p className="text-sm text-gray-600">{t.labels.signInSubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Droplets className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t.labels.title}</h1>
          </div>
          <p className="text-secondary">{t.labels.subtitle}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            data-tour-id="data-entry-edit-columns-button"
            disabled={!(isFieldTab(activeTab) || isBaseTab(activeTab))}
            onClick={() => {
              if (!(isFieldTab(activeTab) || isBaseTab(activeTab))) return;
              setEditPanelOpen(open => !open);
              setEditIconOpen(false);
              setCustomIconOpen(false);
              setExportMenuOpen(false);
              setCalendarOpen(false);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t.labels.editColumnButton.value}
          >
            <PencilLine className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            {t.labels.editColumnButton}
          </button>

          {(isBaseTab(activeTab) || isFieldTab(activeTab)) && (
            <div className="relative">
              <button
                type="button"
                data-tour-id="data-entry-table-actions-button"
                disabled={exportingTable || syncingTable}
                onClick={() => setExportMenuOpen(v => !v)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {exportingTable ? (
                  <Loader2 className="-ml-1 mr-2 h-5 w-5 animate-spin text-gray-500" />
                ) : (
                  <Table className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                )}
                {t.labels.tableActions}
              </button>

              {exportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    role="button"
                    tabIndex={0}
                    onClick={() => setExportMenuOpen(false)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExportMenuOpen(false);
                      }
                    }}
                  />
                  <div
                    className="absolute right-0 mt-2 z-20 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                    data-tour-id="data-entry-table-actions-menu"
                  >
                    <button
                      type="button"
                      data-tour-id="data-entry-table-actions-create-for-tab"
                      onClick={() => createTableFromDataEntry('type')}
                      disabled={exportingTable || syncingTable}
                      className="w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t.labels.createTableForTabPrefix}
                      <span className="font-semibold">{getTabLabel(activeTab)}</span>
                    </button>
                    <button
                      type="button"
                      data-tour-id="data-entry-table-actions-create-single"
                      onClick={() => createTableFromDataEntry('all')}
                      disabled={exportingTable || syncingTable}
                      className="w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t.labels.createSingleTable}
                    </button>
                    {linkedTable && (
                      <button
                        type="button"
                        data-tour-id="data-entry-table-actions-sync-linked"
                        onClick={() => syncDataEntryTable(linkedTable.id)}
                        disabled={exportingTable || syncingTable}
                        className="w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {syncingTable ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t.labels.syncing}
                          </span>
                        ) : (
                          <>
                            {t.labels.syncWithTablePrefix}
                            <span className="font-semibold">{linkedTable.name}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {(status || error) && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            status?.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{status?.message || error}</span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          className="border-b border-gray-100 flex items-center overflow-x-auto gap-2 pr-2"
          data-tour-id="tabs-section"
        >
          <div className="flex items-center">
            {visibleBaseTabs
              .map(t => t as TabKey)
              .concat(customFields.map(f => `field:${f.id}` as CustomFieldTabKey))
              .concat(['custom' as const])
              .map(tab => {
                const isActive = tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setCalendarOpen(false);
                      setCustomIconOpen(false);
                      setExportMenuOpen(false);
                      setEditPanelOpen(false);
                      setEditIconOpen(false);
                      if (tab === 'custom') {
                        setCustomFieldHighlight(true);
                        window.setTimeout(() => setCustomFieldHighlight(false), 1200);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-gray-600 hover:text-primary'
                    }`}
                  >
                    {getTabIcon(tab)}
                    {getTabLabel(tab)}
                    {(isFieldTab(tab) || isBaseTab(tab)) && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (isFieldTab(tab)) {
                            const fieldId = getFieldId(tab);
                            const field = customFields.find(f => f.id === fieldId);
                            if (field) openDeleteDialog(field);
                          } else if (isBaseTab(tab)) {
                            void openDeleteDialogForBaseTab(tab);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isFieldTab(tab)) {
                              const fieldId = getFieldId(tab);
                              const field = customFields.find(f => f.id === fieldId);
                              if (field) openDeleteDialog(field);
                            } else if (isBaseTab(tab)) {
                              void openDeleteDialogForBaseTab(tab);
                            }
                          }
                        }}
                        className="ml-1 inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title={t.labels.deleteTabTitle.value}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600">
            {isFieldTab(activeTab)
              ? `${t.labels.dataEntryForTabPrefix.value}${getTabLabel(activeTab)}${t.labels.dataEntryForTabSuffix.value}`
              : currentMeta.description}
          </div>

          {(isFieldTab(activeTab) || isBaseTab(activeTab)) && editPanelOpen && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PencilLine className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-gray-900">
                    {t.labels.editColumnTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPanelOpen(false);
                      setEditIconOpen(false);
                    }}
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {t.labels.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={saveTabEdit}
                    disabled={savingEdit}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.labels.saveChanges
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 block mb-1">
                    {t.labels.columnNameLabel}
                  </span>
                  <input
                    type="text"
                    value={editFieldName}
                    onChange={e => setEditFieldName(e.target.value)}
                    placeholder={t.labels.columnNamePlaceholder.value}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </label>

                {editingBaseTab ? null : (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIconOpen(v => !v);
                          setCustomIconOpen(false);
                          setExportMenuOpen(false);
                          setCalendarOpen(false);
                        }}
                        className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        title={t.labels.chooseIconTitle.value}
                      >
                        {renderIconPreview(editFieldIcon || 'mdi:tag')}
                        <span className="text-sm font-semibold">{t.labels.iconLabel}</span>
                      </button>

                      {editIconOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditIconOpen(false)}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setEditIconOpen(false);
                              }
                            }}
                          />
                          <div className="absolute mt-2 z-30 w-[320px] rounded-xl border border-gray-200 bg-white shadow-xl p-4">
                            <div className="grid grid-cols-7 gap-2">
                              {CUSTOM_FIELD_ICONS.map(icon => (
                                <button
                                  key={icon}
                                  type="button"
                                  onClick={() => {
                                    setEditFieldIcon(icon);
                                    setEditIconOpen(false);
                                  }}
                                  className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors ${
                                    editFieldIcon === icon
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                  }`}
                                  title={icon}
                                >
                                  {renderIconPreview(icon)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'custom' ? (
            <div className="space-y-4">
              <div
                ref={customFieldRef}
                data-tour-id="custom-field-form"
                className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all ${
                  customFieldHighlight ? 'ring-2 ring-primary/40' : ''
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 block mb-1">
                      {t.labels.columnNameLabel}
                    </span>
                    <input
                      type="text"
                      value={newCustomFieldName}
                      onChange={e => setNewCustomFieldName(e.target.value)}
                      placeholder={t.labels.columnNamePlaceholder.value}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarOpen(false);
                        setExportMenuOpen(false);
                        setCustomIconOpen(v => !v);
                      }}
                      className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      title={t.labels.chooseIconTitle.value}
                    >
                      {renderIconPreview(newCustomFieldIcon || 'mdi:tag')}
                      <span className="text-sm font-semibold">{t.labels.iconLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={createCustomField}
                      disabled={creatingCustomField}
                      className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50"
                    >
                      {creatingCustomField ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t.labels.create
                      )}
                    </button>
                  </div>
                </div>

                {customIconOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      role="button"
                      tabIndex={0}
                      onClick={() => setCustomIconOpen(false)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setCustomIconOpen(false);
                        }
                      }}
                    />
                    <div className="absolute mt-2 z-20 w-[320px] rounded-xl border border-gray-200 bg-white shadow-xl p-4">
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {CUSTOM_FIELD_ICONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setNewCustomFieldIcon(icon);
                              setCustomIconOpen(false);
                            }}
                            className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors ${
                              newCustomFieldIcon === icon
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title={icon}
                          >
                            {renderIconPreview(icon)}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            triggerIconUpload();
                            // Keep input mounted while the OS file picker opens.
                            setTimeout(() => setCustomIconOpen(false), 0);
                          }}
                          disabled={uploadingIcon}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-all"
                        >
                          {uploadingIcon ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t.labels.loading}
                            </>
                          ) : (
                            t.labels.uploadIcon
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconFileChange}
              />

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{t.labels.myColumns}</h3>
                  <span className="text-xs text-gray-500">
                    {loadingCustomFields
                      ? t.labels.loadingEllipsis
                      : `${customFields.length} ${t.labels.piecesShort.value}`}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {customFields.map(field => (
                    <div key={field.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderIconPreview(field.icon || 'mdi:tag', 'h-5 w-5 text-gray-700')}
                        <span className="text-sm font-semibold text-gray-900">{field.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(field)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Trash2 className="h-4 w-4" /> {t.labels.delete}
                      </button>
                    </div>
                  ))}
                  {!loadingCustomFields && customFields.length === 0 && (
                    <div className="py-6 text-sm text-gray-500 text-center">
                      {t.labels.noColumnsYet}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="relative" data-tour-id="date-field">
                  <DatePicker
                    aria-label="Date"
                    label={t.labels.date}
                    value={toCalendarDate(currentForm.date)}
                    onChange={date => {
                      handleChange(activeTab, 'date', date ? date.toString() : '');
                      setCalendarOpen(false);
                    }}
                    isOpen={calendarOpen}
                    onOpenChange={setCalendarOpen}
                    granularity="day"
                    showMonthAndYearPickers
                    size="sm"
                    variant="bordered"
                    className="w-full"
                    classNames={{
                      label: 'mb-1 text-sm font-medium text-gray-700',
                      inputWrapper:
                        'rounded-lg border-gray-200 bg-white hover:border-gray-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-1 group-data-[focus=true]:ring-primary',
                      input: 'text-sm',
                      segment: 'text-sm',
                      selectorButton: 'text-gray-500',
                    }}
                  />
                </div>

                <label className="block" data-tour-id="amount-field">
                  <span className="text-sm font-medium text-gray-700 block mb-1">
                    {t.labels.amount}
                  </span>
                  <input
                    type="number"
                    value={currentForm.amount}
                    onChange={e => handleChange(activeTab, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </label>

                <label className="block" data-tour-id="note-field">
                  <span className="text-sm font-medium text-gray-700 block mb-1">
                    {t.labels.comment}
                  </span>
                  <input
                    type="text"
                    value={currentForm.note}
                    onChange={e => handleChange(activeTab, 'note', e.target.value)}
                    placeholder={t.labels.commentPlaceholder.value}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </label>

                <div className="block" data-tour-id="currency-field">
                  <span className="text-sm font-medium text-gray-700 block mb-1">
                    {t.labels.currency}
                  </span>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setCurrencyModalOpen(true)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-left hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {currentForm.currency
                        ? currencies.find(c => c.value === currentForm.currency)?.label ||
                          currentForm.currency
                        : t.labels.currency}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleSubmit(activeTab)}
                  disabled={saving}
                  data-tour-id="save-entry-button"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {t.labels.saveEntry}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {(isBaseTab(activeTab) || isFieldTab(activeTab)) && (
        <div
          className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm"
          data-tour-id="entries-list-section"
        >
          <div
            className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50/50 rounded-t-xl sm:flex-row sm:items-center sm:justify-between"
            data-tour-id="entries-header"
          >
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-gray-900">
                {t.labels.recentEntriesTitlePrefix}
                {getTabLabel(activeTab)}
              </h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72" data-tour-id="search-entries">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={activeQuery}
                    onChange={e => setQueryForTab(activeTab, e.target.value)}
                    placeholder={t.labels.searchEntriesPlaceholder.value}
                    className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-9 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                  {activeQuery ? (
                    <button
                      type="button"
                      onClick={() => setQueryForTab(activeTab, '')}
                      title={t.labels.clearSearchTitle.value}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="relative w-full sm:w-48" data-tour-id="date-filter">
                  <DatePicker
                    aria-label={t.labels.filterDateTitle.value}
                    value={toCalendarDate(activeDate)}
                    onChange={date => {
                      setDateForTab(activeTab, date ? date.toString() : '');
                      setListCalendarOpen(false);
                    }}
                    isOpen={listCalendarOpen}
                    onOpenChange={open => {
                      if (open) {
                        setCalendarOpen(false);
                        setCustomIconOpen(false);
                        setExportMenuOpen(false);
                      }
                      setListCalendarOpen(open);
                    }}
                    granularity="day"
                    showMonthAndYearPickers
                    size="sm"
                    variant="bordered"
                    radius="full"
                    selectorButtonPlacement="start"
                    className="w-full"
                    classNames={{
                      inputWrapper:
                        'h-8 rounded-full border-gray-200 bg-white pr-9 hover:border-gray-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-1 group-data-[focus=true]:ring-primary',
                      input: 'text-sm',
                      segment: 'text-sm',
                      selectorButton: 'text-gray-500',
                    }}
                  />
                  {activeDate ? (
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setDateForTab(activeTab, '');
                        setListCalendarOpen(false);
                      }}
                      title={t.labels.clearDateTitle.value}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {t.labels.recentEntriesHint}
              </span>
            </div>
          </div>

          {loadingList ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {t.labels.loadingData}
            </div>
          ) : currentEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center">
              <div className="bg-gray-100 p-3 rounded-full mb-3">
                <ClipboardList className="h-6 w-6 text-gray-400" />
              </div>
              {activeQuery.trim() || activeDate
                ? t.labels.noEntriesFound
                : t.labels.noEntriesForTab}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {currentEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">
                          {format(new Date(entry.date), 'dd.MM.yyyy')}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {getTabLabel(activeTab)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {entry.note || t.labels.noComment.value}
                        {entry.customFieldName && entry.customFieldValue ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="mx-1">•</span>
                            {entry.customFieldIcon ? (
                              <Icon
                                icon={entry.customFieldIcon}
                                className="h-3.5 w-3.5 text-gray-500"
                              />
                            ) : null}
                            <span>
                              {entry.customFieldName}: {entry.customFieldValue}
                            </span>
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 font-mono">
                          {Number(entry.amount || 0).toLocaleString(resolveLocale(locale), {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold text-right">
                          {entry.currency || 'KZT'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={removingId === entry.id}
                        className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title={t.labels.deleteEntryTitle.value}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showPagination && (
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50"
                  data-tour-id="pagination"
                >
                  <div className="text-sm text-gray-600 font-medium">
                    {t.labels.paginationShowingPrefix.value} {effectiveStartIndex}–
                    {effectiveEndIndex} {t.labels.paginationShowingOf.value}{' '}
                    {effectiveListMeta.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-semibold text-center min-w-[120px]">
                      {t.labels.paginationPageShort.value} {effectiveListMeta.page} из{' '}
                      {effectiveTotalPages}
                    </span>
                    <AppPagination
                      page={effectiveListMeta.page}
                      total={effectiveTotalPages}
                      onChange={nextPage => setPageForTab(activeTab, nextPage)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {deleteDialog.open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            role="button"
            tabIndex={0}
            onClick={closeDeleteDialog}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                closeDeleteDialog();
              }
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900">{t.labels.deleteTabTitle}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t.labels.tabLabel}{' '}
                  <span className="font-semibold text-gray-900">{deleteDialog.name}</span>
                </p>
                {deleteDialog.entriesCount > 0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t.labels.tabHasDataPrefix.value}
                    {deleteDialog.entriesCount}
                    {t.labels.tabHasDataSuffix.value}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">{t.labels.tabNoData}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-100 p-4">
                {deleteDialog.entriesCount > 0 && (
                  <button
                    type="button"
                    onClick={exportTabToCustomTableAndDelete}
                    disabled={exportingTabToTable || deletingTab}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {exportingTabToTable ? t.labels.copying : t.labels.copyAndDelete}
                  </button>
                )}
                <button
                  type="button"
                  onClick={deleteTabOnly}
                  disabled={exportingTabToTable || deletingTab}
                  className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingTab ? t.labels.deleting : t.labels.deleteTabTitle}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={exportingTabToTable || deletingTab}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.labels.cancel}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {currencyModalOpen && (
        <>
          <div
            className="fixed inset-0 z-70 bg-black/30"
            role="button"
            tabIndex={0}
            onClick={() => setCurrencyModalOpen(false)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setCurrencyModalOpen(false);
              }
            }}
          />
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
            <div className="w-full max-w-md max-h-[80vh] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 shrink-0">
                <h3 className="text-lg font-bold text-gray-900">{t.labels.currency}</h3>
              </div>

              <div className="px-5 pb-5 flex-1 overflow-y-auto">
                <Select
                  options={currencies}
                  value={currencies.find(c => c.value === currentForm.currency)}
                  onChange={option => {
                    if (option) {
                      handleChange(activeTab, 'currency', option.value);
                      setCurrencyModalOpen(false);
                    }
                  }}
                  placeholder={t.labels.currency}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isSearchable
                  menuShouldScrollIntoView={false}
                  styles={{
                    menu: base => ({
                      ...base,
                      position: 'relative',
                      zIndex: 1,
                    }),
                    menuList: base => ({
                      ...base,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }),
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => setCurrencyModalOpen(false)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {t.labels.cancel}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
