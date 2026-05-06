'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import { Check, ChevronRight, FolderOpen, Lock, Plus, Search as SearchIcon, Tag } from '@/app/components/icons';
import {
  Box,
  Button,
  CircularProgress,
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
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { tokens } from '@/lib/theme-tokens';

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

const SOURCE_BADGE_COLORS: Record<NonNullable<Category['source']>, { bg: string; color: string; border: string }> = {
  system: { bg: 'var(--color-info-soft-bg)', color: 'var(--color-info-soft-text)', border: 'var(--color-info-soft-border)' },
  parsing: { bg: 'var(--color-warning-soft-bg)', color: '#d97706', border: 'var(--color-warning-soft-border)' },
  user: { bg: 'var(--muted)', color: 'var(--text-secondary)', border: 'var(--border-color)' },
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
  const tx = (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

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
      return tx(['sourceBadges', 'parsing'], 'Parsing data');
    }

    if (category.isSystem || category.source === 'system') {
      return tx(['sourceBadges', 'system'], 'System');
    }

    return null;
  };

  const getCategoryBadgeSource = (category: Category): NonNullable<Category['source']> | null => {
    if (category.source === 'parsing') return 'parsing';
    if (category.isSystem || category.source === 'system') return 'system';
    return null;
  };

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
    } catch (err) {
      console.error('Failed to load categories:', err);
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
    } catch (err) {
      console.error('Failed to save category:', err);
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
    } catch (err) {
      console.error('Failed to toggle category state:', err);
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
      } catch (err) {
        console.error('Failed to get category usage count:', err);
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
    } catch (err) {
      console.error('Failed to bulk toggle categories:', err);
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
    } catch (err) {
      console.error('Failed to delete categories:', err);
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
    } catch (err) {
      console.error('Failed to upload icon:', err);
      toast.error(t.toasts.iconUploadFailed.value);
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = '';
      }
    }
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 6 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Page header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'flex-start' }, justifyContent: { lg: 'space-between' }, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: tokens.radius.sm,
                bgcolor: 'rgba(var(--primary-rgb,22,129,24),0.1)',
                color: 'var(--primary)',
                flexShrink: 0,
              }}
            >
              <FolderOpen size={22} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                {t.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 672, color: 'var(--muted-foreground)' }}>
                {t.subtitle}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <button
              type="button"
              onClick={() => handleOpenDialog()}
              data-tour-id="categories-add-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                background: 'var(--primary)',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                borderRadius: tokens.radius.md,
              }}
            >
              <Plus size={16} />
              {t.add}
            </button>
          </Box>
        </Box>

        {/* Search + bulk actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: { lg: 'space-between' }, gap: 2 }}>
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 448 }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-tour-id="categories-search"
              placeholder={tx(['searchPlaceholder'], 'Find category')}
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                padding: '10px 16px 10px 40px',
                fontSize: 14,
                color: 'var(--foreground)',
                borderRadius: tokens.radius.md,
                boxSizing: 'border-box',
              }}
            />
          </Box>
          {selectedIds.size > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500} sx={{ mr: 1, color: 'var(--muted-foreground)' }}>
                {selectedIds.size} selected
              </Typography>
              <button
                type="button"
                onClick={() => handleBulkEnable(true)}
                style={{ border: '1px solid var(--border)', background: 'var(--card)', padding: '6px 12px', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer', borderRadius: tokens.radius.md }}
              >
                Enable
              </button>
              <button
                type="button"
                onClick={() => handleBulkEnable(false)}
                style={{ border: '1px solid var(--border)', background: 'var(--card)', padding: '6px 12px', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer', borderRadius: tokens.radius.md }}
              >
                Disable
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'var(--color-error-soft-bg)', padding: '6px 12px', fontSize: 14, fontWeight: 500, color: 'var(--destructive)', cursor: 'pointer', borderRadius: tokens.radius.md }}
              >
                Delete Custom
              </button>
            </Box>
          )}
        </Box>

        {/* Info banner */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(var(--primary-rgb,22,129,24),0.1)', borderRadius: tokens.radius.md, px: 1.5, py: 1, fontSize: 14, color: 'var(--primary)' }}>
          Disabling a category will hide it from statements and reports.
        </Box>

        {/* Category list */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 1 }} data-tour-id="categories-list">
          {/* Table header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Checkbox
                aria-label="Select all categories"
                checked={
                  selectedIds.size === filteredCategories.length && filteredCategories.length > 0
                }
                onCheckedChange={handleToggleSelectAll}
              />
              <span>{tx(['columns', 'name'], 'Name')}</span>
            </Box>
            <span>{tx(['enabled'], 'Enabled')}</span>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress size={32} />
            </Box>
          ) : filteredCategories.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Box
                sx={{
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: tokens.radius.full,
                  bgcolor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}
              >
                <SearchIcon size={32} />
              </Box>
              <Typography variant="h6" fontWeight={500} sx={{ color: 'var(--foreground)', mb: 3 }}>
                {tx(['noData'], 'No categories')}
              </Typography>
              <button
                type="button"
                onClick={() => handleOpenDialog()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', background: 'var(--card)', padding: '8px 16px', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer', borderRadius: tokens.radius.md }}
              >
                <Plus size={16} />
                {t.add}
              </button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1, pb: 2 }}>
              {filteredCategories.map((category, index) => {
                const categoryColor = category.color || '#2196F3';
                const hasIcon = Boolean(category.icon?.trim());
                const iconUrl = resolveIconUrl(category.icon);
                const iconTint = alpha(categoryColor, category.isEnabled === false ? 0.12 : 0.16);
                const badgeLabel = getCategoryBadgeLabel(category);
                const badgeSource = getCategoryBadgeSource(category);
                const badgeColors = badgeSource ? SOURCE_BADGE_COLORS[badgeSource] : null;
                const isEnabled = category.isEnabled !== false;
                const isToggling = togglingIds.has(category.id);

                return (
                  <Box
                    key={category.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${categoryColor}`,
                      borderRadius: tokens.radius.md,
                      px: 2,
                      py: 2,
                      bgcolor: index % 2 === 0 ? 'var(--card)' : 'rgba(var(--muted-rgb,243,244,246),0.4)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Checkbox
                        aria-label={category.name}
                        checked={selectedIds.has(category.id)}
                        onCheckedChange={() => handleToggleSelect(category.id)}
                      />
                      {!category.isSystem && hasIcon ? (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: tokens.radius.sm,
                            bgcolor: iconTint,
                            color: categoryColor,
                          }}
                        >
                          {iconUrl ? (
                            <Box
                              component="img"
                              src={iconUrl}
                              alt=""
                              sx={{ width: 16, height: 16, objectFit: 'contain' }}
                            />
                          ) : (
                            <Tag size={16} />
                          )}
                        </Box>
                      ) : null}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                            {getCategoryDisplayName(category, locale)}
                          </Typography>
                          {badgeLabel && badgeColors && (
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.25,
                                fontSize: 12,
                                fontWeight: 500,
                                bgcolor: badgeColors.bg,
                                color: badgeColors.color,
                                border: `1px solid ${badgeColors.border}`,
                                borderRadius: tokens.radius.sm,
                              }}
                            >
                              {badgeLabel}
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block', mt: 0.25 }}>
                          {usageCounts[category.id]?.total ? (
                            <span>Used in {usageCounts[category.id].total} transactions</span>
                          ) : (
                            <span>Not used yet</span>
                          )}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {/* Toggle switch */}
                      <button
                        type="button"
                        data-tour-id={index === 0 ? 'category-toggle' : undefined}
                        onClick={event => {
                          event.stopPropagation();
                          handleToggleEnabled(category);
                        }}
                        disabled={isToggling}
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          alignItems: 'center',
                          width: 54,
                          height: 32,
                          borderRadius: tokens.radius.full,
                          border: 'none',
                          background: isEnabled ? 'var(--primary)' : 'rgba(107,114,128,0.4)',
                          cursor: isToggling ? 'default' : 'pointer',
                          opacity: isToggling ? 0.6 : 1,
                          transition: 'background 0.2s',
                          padding: 0,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            display: 'inline-block',
                            width: 24,
                            height: 24,
                            borderRadius: tokens.radius.full,
                            background: 'var(--card)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s',
                            transform: isEnabled ? 'translateX(28px)' : 'translateX(4px)',
                          }}
                        />
                      </button>

                      {category.isSystem ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: tokens.radius.full,
                            color: 'rgba(107,114,128,0.6)',
                          }}
                        >
                          <Lock size={16} />
                        </Box>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(category)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: tokens.radius.full,
                            color: 'var(--muted-foreground)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* Edit/Create dialog */}
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
                  borderRadius: tokens.radius.lg,
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
                      borderRadius: tokens.radius.sm,
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
                    <Tag size={24} />
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <label style={{ display: 'inline-flex', cursor: 'pointer', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formData.withoutIcon}
                    onChange={e => setFormData({ ...formData, withoutIcon: e.target.checked })}
                  />
                  {tx(['dialog', 'withoutIcon'], 'Without icon')}
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
                        borderRadius: tokens.radius.sm,
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

            {/* Color Picker */}
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
                      borderRadius: tokens.radius.full,
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
                    {formData.color === color && <Check size={20} style={{ color: 'white' }} />}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Preview */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: tokens.radius.lg,
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
                  borderRadius: tokens.radius.sm,
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
                  <Tag size={28} />
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

      {/* Disable confirm dialog */}
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
    </Box>
  );
}
