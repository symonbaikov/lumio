'use client';

import { useAuth } from '@/app/hooks/useAuth';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import apiClient from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import { Icon } from '@iconify/react';
import {
  Add,
  Check,
  ChevronRight,
  Delete,
  Edit,
  FolderOutlined,
  MoreVert,
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
  Menu,
  MenuItem,
  Select,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  parentId?: string;
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

export default function CategoriesPage() {
  const t = useIntlayer('categoriesPage');
  const theme = useTheme();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  // useLockBodyScroll(dialogOpen);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Menu state for "..." actions
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetCategory, setMenuTargetCategory] = useState<Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#2196F3',
    icon: 'mdi:tag',
    parentId: '',
  });

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || cat.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, category: Category) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTargetCategory(category);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTargetCategory(null);
  };

  const onEditFromMenu = () => {
    if (menuTargetCategory) {
      handleOpenDialog(menuTargetCategory);
    }
    handleMenuClose();
  };

  const onDeleteFromMenu = () => {
    if (menuTargetCategory) {
      handleDelete(menuTargetCategory.id);
    }
    handleMenuClose();
  };

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/categories');
      setCategories(response.data);
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
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        color: '#2196F3',
        icon: 'mdi:tag',
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
      const data = {
        ...formData,
        parentId: formData.parentId || undefined,
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

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete.value)) {
      return;
    }

    try {
      await apiClient.delete(`/categories/${id}`);
      await loadCategories();
      toast.success(t.toasts.deleted.value);
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error(t.toasts.deleteFailed.value);
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
        setFormData(prev => ({ ...prev, icon: url }));
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
            <button
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
              type="button"
            >
              <MoreVert fontSize="small" />
              {(t as any).more?.value || 'More'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.dialog.placeholderName.value}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filterType === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-100',
              )}
            >
              {t.type.label}
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filterType === 'income'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-100',
              )}
            >
              {t.type.income}
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filterType === 'expense'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-100',
              )}
            >
              {t.type.expense}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
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
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="flex flex-col gap-3 rounded-2xl bg-amber-50/40 px-4 py-4 transition-colors hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80"
                        style={{
                          backgroundColor: alpha(category.color || '#2196F3', 0.12),
                          color: category.color || '#2196F3',
                        }}
                      >
                        {resolveIconUrl(category.icon) ? (
                          <img
                            src={resolveIconUrl(category.icon) as string}
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <Icon icon={category.icon || 'mdi:tag'} width={20} height={20} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.type === 'income' ? t.type.income : t.type.expense}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-11 items-center rounded-full bg-primary/20 px-1">
                        <div className="h-4 w-4 rounded-full bg-primary shadow-sm" />
                      </div>
                      <ChevronRight className="text-gray-400" fontSize="small" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenDialog(category)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
                      title={t.actions.edit.value}
                    >
                      <Edit fontSize="inherit" />
                      {t.actions.edit.value}
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:text-red-600"
                      title={t.actions.delete.value}
                    >
                      <Delete fontSize="inherit" />
                      {t.actions.delete.value}
                    </button>
                    <button
                      onClick={event => handleMenuOpen(event, category)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary/40 hover:text-primary"
                      title="More"
                    >
                      <MoreVert fontSize="small" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu for Edit/Delete actions */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.5,
            borderRadius: 2,
            minWidth: 160,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <MenuItem onClick={onEditFromMenu} sx={{ py: 1.5, fontSize: '0.875rem' }}>
          <Edit fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          {t.actions.edit}
        </MenuItem>
        <MenuItem
          onClick={onDeleteFromMenu}
          sx={{ py: 1.5, fontSize: '0.875rem', color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          {t.actions.delete}
        </MenuItem>
      </Menu>

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
                    onClick={() => setFormData({ ...formData, icon: iconName })}
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mt: 1.5,
                  gap: 2,
                }}
              >
                {resolveIconUrl(formData.icon) && (
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
                {resolveIconUrl(formData.icon) ? (
                  <Box
                    component="img"
                    src={resolveIconUrl(formData.icon) as string}
                    alt=""
                    sx={{ width: 28, height: 28, objectFit: 'contain' }}
                  />
                ) : (
                  <Icon icon={formData.icon || 'mdi:tag'} width={28} height={28} />
                )}
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
    </div>
  );
}
