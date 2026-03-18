'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import { cn } from '@/app/lib/utils';
import { Icon } from '@iconify/react';
import {
  Add,
  Check,
  ChevronRight,
  DeleteOutline,
  FolderOutlined,
  LockOutlined,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isSystem?: boolean;
  source?: 'system' | 'user' | 'parsing';
  isEnabled?: boolean;
  color?: string;
  icon?: string;
  parentId?: string;
}

const SOURCE_BADGE_STYLES: Record<NonNullable<Category['source']>, string> = {
  system: 'bg-blue-50 text-blue-700 ring-blue-700/10',
  parsing: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  user: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};

interface CategoryUsageCount {
  transactions: number;
  statements: number;
  total: number;
}

const resolveIconUrl = (iconValue?: string) => {
  if (!iconValue) return null;
  if (iconValue.startsWith('http')) return iconValue;
  if (iconValue.startsWith('/uploads')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const base = apiUrl.replace(/\/api\/v1$/, '') || '';
    return `${base}${iconValue}`;
  }
  return null;
};

const PREDEFINED_ICONS = [
  'mdi:home',
  'mdi:food',
  'mdi:car',
  'mdi:shopping',
  'mdi:cart',
  'mdi:medical-bag',
  'mdi:school',
  'mdi:briefcase',
  'mdi:airplane',
  'mdi:gift',
  'mdi:gamepad-variant',
  'mdi:dumbbell',
  'mdi:bank',
  'mdi:cash',
  'mdi:chart-line',
  'mdi:credit-card',
  'mdi:shield-check',
  'mdi:cog',
  'mdi:wrench',
  'mdi:tag',
  'mdi:coffee',
  'mdi:monitor',
  'mdi:phone',
  'mdi:music',
  'mdi:camera',
  'mdi:book',
  'mdi:heart',
  'mdi:star',
  'mdi:flag',
  'mdi:bell',
];

const PREDEFINED_COLORS = [
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#03A9F4',
  '#009688',
  '#4CAF50',
  '#8BC34A',
  '#CDDC39',
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF5722',
  '#795548',
  '#9E9E9E',
  '#607D8B',
];

export default function WorkspaceCategoriesView() {
  const t = useIntlayer('categoriesPage');
  const { locale } = useLocale();
  const theme = useTheme();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [usageCounts, setUsageCounts] = useState<Record<string, CategoryUsageCount>>({});
  const [disableConfirm, setDisableConfirm] = useState<{
    category: Category;
    usage: CategoryUsageCount;
  } | null>(null);

  const getCategoryBadgeLabel = (category: Category) => {
    if (category.source === 'parsing') {
      return (t as any).sourceBadges?.parsing?.value || 'Parsing data';
    }

    if (category.isSystem || category.source === 'system') {
      return (t as any).sourceBadges?.system?.value || 'System';
    }

    return null;
  };

  const getCategoryBadgeClassName = (category: Category) => {
    if (category.source === 'parsing') {
      return SOURCE_BADGE_STYLES.parsing;
    }

    if (category.isSystem || category.source === 'system') {
      return SOURCE_BADGE_STYLES.system;
    }

    return null;
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#2196F3',
    icon: 'mdi:tag',
    withoutIcon: false,
    parentId: '',
  });

  const filteredCategories = categories.filter(cat => {
    return getCategoryDisplayName(cat, locale).toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const [categoriesRes, usageRes] = await Promise.all([
        apiClient.get('/categories'),
        apiClient.get('/categories/usage/counts'),
      ]);
      setCategories(categoriesRes.data);
      setUsageCounts(usageRes.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error(t.toasts.loadFailed.value);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || '#2196F3',
        icon: category.icon || 'mdi:tag',
        withoutIcon: !category.icon,
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        color: '#2196F3',
        icon: 'mdi:tag',
        withoutIcon: false,
        parentId: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    if (iconInputRef.current) {
      iconInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      const { withoutIcon, ...restFormData } = formData;
      const data = {
        ...restFormData,
        icon: withoutIcon ? undefined : restFormData.icon,
        parentId: restFormData.parentId || undefined,
      };

      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}`, data);
        toast.success(t.toasts.updated.value);
      } else {
        await apiClient.post('/categories', data);
        toast.success(t.toasts.created.value);
      }

      await loadCategories();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(t.toasts.saveFailed.value);
    }
  };

  const performToggle = async (category: Category, nextEnabled: boolean) => {
    setDisableConfirm(null);
    setTogglingIds(prev => new Set(prev).add(category.id));

    try {
      await apiClient.put(`/categories/${category.id}`, { isEnabled: nextEnabled });
      setCategories(prev =>
        prev.map(item => (item.id === category.id ? { ...item, isEnabled: nextEnabled } : item)),
      );
    } catch (error) {
      console.error('Failed to toggle category state:', error);
      toast.error(t.toasts.saveFailed.value);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
    }
  };

  const handleToggleEnabled = async (category: Category) => {
    if (togglingIds.has(category.id)) {
      return;
    }

    const nextEnabled = category.isEnabled === false;

    if (!nextEnabled) {
      try {
        const response = await apiClient.get(`/categories/${category.id}/usage-count`);
        const usage = response.data as CategoryUsageCount;

        if (usage.total > 0) {
          setDisableConfirm({ category, usage });
          return;
        }
      } catch (error) {
        console.error('Failed to get category usage count:', error);
      }
    }

    await performToggle(category, nextEnabled);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length && filteredCategories.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCategories.map(c => c.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkEnable = async (enable: boolean) => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiClient.put(`/categories/${id}`, { isEnabled: enable }),
        ),
      );
      toast.success(enable ? 'Categories enabled' : 'Categories disabled');
      await loadCategories();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to bulk toggle categories:', error);
      toast.error(t.toasts.saveFailed.value);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('Are you sure you want to delete selected custom categories?')) return;
    try {
      const customIds = Array.from(selectedIds).filter(
        id => !categories.find(c => c.id === id)?.isSystem,
      );
      await Promise.all(customIds.map(id => apiClient.delete(`/categories/${id}`)));
      toast.success('Categories deleted');
      await loadCategories();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete categories:', error);
      toast.error('Failed to delete some categories');
    }
  };

  const triggerIconUpload = () => {
    iconInputRef.current?.click();
  };

  const handleIconFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('icon', file);
    setUploadingIcon(true);
    try {
      const response = await apiClient.post('/data-entry/custom-fields/icon', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data?.url || response.data;
      if (url) {
        setFormData(prev => ({ ...prev, icon: url, withoutIcon: false }));
        toast.success(t.toasts.iconUploaded.value);
      }
    } catch (error) {
      console.error('Failed to upload icon:', error);
      toast.error(t.toasts.iconUploadFailed.value);
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderOutlined className="text-[22px]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenDialog()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Add fontSize="small" />
              {t.add}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fontSize="small"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={(t as any).searchPlaceholder?.value || 'Find category'}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 mr-2">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkEnable(true)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Enable
              </button>
              <button
                onClick={() => handleBulkEnable(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Disable
              </button>
              <button
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Delete Custom
              </button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
          Disabling a category will hide it from statements and reports.
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="flex items-center gap-3">
              <Checkbox
                aria-label="Select all categories"
                className="h-4 w-4 rounded border-gray-300"
                checked={
                  selectedIds.size === filteredCategories.length && filteredCategories.length > 0
                }
                onCheckedChange={handleToggleSelectAll}
              />
              <span>{(t as any).columns?.name?.value || 'Название'}</span>
            </div>
            <span>{(t as any).enabled?.value || 'Enabled'}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <SearchIcon className="text-[32px]" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {(t as any).noData?.value || 'Нет категорий'}
              </h3>
              <div className="mt-6">
                <button
                  onClick={() => handleOpenDialog()}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary"
                >
                  <Add fontSize="small" />
                  {t.add}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-2 pb-4">
              {filteredCategories.map((category, index) => {
                const categoryColor = category.color || '#2196F3';
                const hasIcon = Boolean(category.icon?.trim());
                const iconUrl = resolveIconUrl(category.icon);
                const iconTint = alpha(categoryColor, category.isEnabled === false ? 0.12 : 0.16);
                const badgeLabel = getCategoryBadgeLabel(category);
                const badgeClassName = getCategoryBadgeClassName(category);

                return (
                  <div
                    key={category.id}
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-4 transition-colors',
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80',
                    )}
                    style={{ borderLeft: `3px solid ${categoryColor}` }}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        aria-label={category.name}
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedIds.has(category.id)}
                        onCheckedChange={() => handleToggleSelect(category.id)}
                      />
                      {!category.isSystem && hasIcon ? (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: iconTint, color: categoryColor }}
                        >
                          {iconUrl ? (
                            <Box
                              component="img"
                              src={iconUrl}
                              alt=""
                              sx={{ width: 16, height: 16, objectFit: 'contain' }}
                            />
                          ) : (
                            <Icon icon={category.icon || 'mdi:tag'} width={16} height={16} />
                          )}
                        </div>
                      ) : null}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-slate-900">
                            {getCategoryDisplayName(category, locale)}
                          </span>
                          {badgeLabel && badgeClassName && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                badgeClassName,
                              )}
                            >
                              {badgeLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {usageCounts[category.id]?.total ? (
                            <span>Used in {usageCounts[category.id].total} transactions</span>
                          ) : (
                            <span>Not used yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          handleToggleEnabled(category);
                        }}
                        disabled={togglingIds.has(category.id)}
                        className={cn(
                          'relative inline-flex h-8 w-[54px] items-center rounded-full transition-colors',
                          category.isEnabled === false ? 'bg-gray-300' : 'bg-primary',
                          togglingIds.has(category.id) ? 'opacity-60' : 'opacity-100',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform',
                            category.isEnabled === false ? 'translate-x-1' : 'translate-x-7',
                          )}
                        />
                      </button>
                      {category.isSystem ? (
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-300">
                          <LockOutlined fontSize="small" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(category)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500"
                        >
                          <ChevronRight fontSize="small" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingCategory ? t.dialog.editTitle : t.dialog.createTitle}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Name and Type */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t.dialog.nameLabel.value}
                placeholder={t.dialog.placeholderName.value}
                fullWidth
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>{t.type.label}</InputLabel>
                <Select
                  value={formData.type}
                  label={t.type.label.value}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'income' | 'expense',
                    })
                  }
                >
                  <MenuItem value="income">{t.type.income}</MenuItem>
                  <MenuItem value="expense">{t.type.expense}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Icon Picker */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t.dialog.chooseIcon}
              </Typography>
              <input
                type="file"
                accept="image/*"
                ref={iconInputRef}
                style={{ display: 'none' }}
                onChange={handleIconFileChange}
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {PREDEFINED_ICONS.map(iconName => (
                  <Box
                    key={iconName}
                    onClick={() => setFormData({ ...formData, icon: iconName, withoutIcon: false })}
                    sx={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor:
                        formData.icon === iconName ? alpha(formData.color, 0.2) : 'transparent',
                      color: formData.icon === iconName ? formData.color : 'text.secondary',
                      border:
                        formData.icon === iconName
                          ? `2px solid ${formData.color}`
                          : '1px solid transparent',
                      '&:hover': {
                        bgcolor: alpha(formData.color || theme.palette.primary.main, 0.1),
                        color: formData.color || theme.palette.primary.main,
                      },
                    }}
                  >
                    <Icon icon={iconName} width={24} height={24} />
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.withoutIcon}
                    onChange={e => setFormData({ ...formData, withoutIcon: e.target.checked })}
                  />
                  {(t as any).dialog?.withoutIcon?.value || 'Without icon'}
                </label>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mt: 1.5,
                  gap: 2,
                }}
              >
                {!formData.withoutIcon && resolveIconUrl(formData.icon) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t.dialog.uploadedIcon}
                    </Typography>
                    <Box
                      component="img"
                      src={resolveIconUrl(formData.icon) || formData.icon}
                      alt=""
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        objectFit: 'contain',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  </Box>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={triggerIconUpload}
                  disabled={uploadingIcon}
                  sx={{ ml: 'auto' }}
                >
                  {uploadingIcon ? t.dialog.uploading : t.dialog.uploadIcon}
                </Button>
              </Box>
            </Box>

            {/* Color Picker (Preset colors) */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t.dialog.chooseColor}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {PREDEFINED_COLORS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: formData.color === color ? 3 : 0,
                      transform: formData.color === color ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s',
                      border: formData.color === color ? '2px solid white' : 'none',
                      outline: formData.color === color ? `2px solid ${color}` : 'none',
                    }}
                  >
                    {formData.color === color && <Check sx={{ color: 'white', fontSize: 20 }} />}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Preview Section */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t.dialog.preview}
              </Typography>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(formData.color || '#2196F3', 0.1),
                  color: formData.color || '#2196F3',
                }}
              >
                {!formData.withoutIcon && resolveIconUrl(formData.icon) ? (
                  <Box
                    component="img"
                    src={resolveIconUrl(formData.icon) as string}
                    alt=""
                    sx={{ width: 28, height: 28, objectFit: 'contain' }}
                  />
                ) : !formData.withoutIcon ? (
                  <Icon icon={formData.icon || 'mdi:tag'} width={28} height={28} />
                ) : null}
              </Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {formData.name || t.dialog.placeholderName}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            {t.dialog.cancel}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            {t.dialog.save}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(disableConfirm)}
        onClose={() => setDisableConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Disable category?</DialogTitle>
        <DialogContent dividers>
          {disableConfirm ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Category <strong>{disableConfirm.category.name}</strong> is already used in:
              </Typography>
              <Typography variant="body2" color="text.primary">
                {disableConfirm.usage.transactions} transaction
                {disableConfirm.usage.transactions === 1 ? '' : 's'}
              </Typography>
              <Typography variant="body2" color="text.primary">
                {disableConfirm.usage.statements} statement
                {disableConfirm.usage.statements === 1 ? '' : 's'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500, mt: 1 }}>
                Existing items will show a warning until a new category is selected.
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisableConfirm(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (disableConfirm) {
                void performToggle(disableConfirm.category, false);
              }
            }}
          >
            Disable
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
