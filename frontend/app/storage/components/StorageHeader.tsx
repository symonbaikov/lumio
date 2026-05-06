'use client';

import { Box, TextField, Typography } from '@mui/material';
import { FileText, Filter, Folder, Search, Trash2 } from '@/app/components/icons';
import React from 'react';
import { DroppableHeaderTrigger } from './DroppableHeaderTrigger';
import { listToggleSx } from '../helpers/storageStyling';
import type { StorageFile } from '../storageHelpers';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';

type SortKey = string;

export interface StorageHeaderProps {
  isTrashView: boolean;
  isFolderActive: boolean;
  draggingFile: StorageFile | null;
  searchQuery: string;
  sortKey: SortKey;
  filtersApplied: boolean;
  titleLabel: React.ReactNode;
  subtitleLabel: React.ReactNode;
  searchPlaceholder: string;
  searchFilesLabel: string;
  sortNewest: React.ReactNode;
  sortOldest: React.ReactNode;
  sortNameAsc: React.ReactNode;
  sortNameDesc: React.ReactNode;
  sortBankAsc: React.ReactNode;
  sortBankDesc: React.ReactNode;
  foldersTitleLabel: React.ReactNode;
  tabsAllLabel: React.ReactNode;
  tabsTrashLabel: React.ReactNode;
  filtersButtonLabel: React.ReactNode;
  activeModal: 'folders' | null;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onOpenFilters: () => void;
  onListChangeActive: () => void;
  onListChangeTrash: () => void;
  onOpenFolderModal: () => void;
  onFolderDragOver: () => void;
}

export function StorageHeader({
  isTrashView,
  isFolderActive,
  draggingFile,
  searchQuery,
  sortKey,
  filtersApplied,
  titleLabel,
  subtitleLabel,
  searchPlaceholder,
  searchFilesLabel,
  sortNewest,
  sortOldest,
  sortNameAsc,
  sortNameDesc,
  sortBankAsc,
  sortBankDesc,
  foldersTitleLabel,
  tabsAllLabel,
  tabsTrashLabel,
  filtersButtonLabel,
  onSearchChange,
  onSortChange,
  onOpenFilters,
  onListChangeActive,
  onListChangeTrash,
  onOpenFolderModal,
  onFolderDragOver,
}: StorageHeaderProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${c.ink150}`,
        p: 3,
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ p: 1, borderRadius: tokens.radius.full, bgcolor: 'rgba(22,129,24,0.1)', color: 'primary.main' }}>
            <Folder style={{ width: 24, height: 24 }} />
          </Box>
          <Typography component="h1" style={{ fontSize: 22, fontWeight: 700, color: c.ink900 }}>
            {titleLabel}
          </Typography>
        </Box>
        <Typography style={{ fontSize: 14, color: c.ink500 }}>{subtitleLabel}</Typography>
      </Box>
      <Box sx={{ display: 'flex', width: { xs: '100%', md: 'auto' }, flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 1.5, position: 'relative' }}>
          <StorageTabButtons
            isTrashView={isTrashView}
            isFolderActive={isFolderActive}
            draggingFile={draggingFile}
            foldersTitleLabel={foldersTitleLabel}
            tabsAllLabel={tabsAllLabel}
            tabsTrashLabel={tabsTrashLabel}
            onListChangeActive={onListChangeActive}
            onListChangeTrash={onListChangeTrash}
            onOpenFolderModal={onOpenFolderModal}
            onFolderDragOver={onFolderDragOver}
          />
          <StorageSearchInput
            searchQuery={searchQuery}
            searchPlaceholder={searchPlaceholder}
            searchFilesLabel={searchFilesLabel}
            onSearchChange={onSearchChange}
          />
          <StorageSortSelect
            sortKey={sortKey}
            sortNewest={sortNewest}
            sortOldest={sortOldest}
            sortNameAsc={sortNameAsc}
            sortNameDesc={sortNameDesc}
            sortBankAsc={sortBankAsc}
            sortBankDesc={sortBankDesc}
            onSortChange={onSortChange}
          />
          <StorageFilterButton
            filtersApplied={filtersApplied}
            filtersButtonLabel={filtersButtonLabel}
            onOpenFilters={onOpenFilters}
          />
        </Box>
      </Box>
    </Box>
  );
}

interface StorageTabButtonsProps {
  isTrashView: boolean;
  isFolderActive: boolean;
  draggingFile: StorageFile | null;
  foldersTitleLabel: React.ReactNode;
  tabsAllLabel: React.ReactNode;
  tabsTrashLabel: React.ReactNode;
  onListChangeActive: () => void;
  onListChangeTrash: () => void;
  onOpenFolderModal: () => void;
  onFolderDragOver: () => void;
}

function StorageTabButtons({
  isTrashView,
  isFolderActive,
  draggingFile,
  foldersTitleLabel,
  tabsAllLabel,
  tabsTrashLabel,
  onListChangeActive,
  onListChangeTrash,
  onOpenFolderModal,
  onFolderDragOver,
}: StorageTabButtonsProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${c.ink150}`, bgcolor: c.ink50, p: 0.5 }}>
        <Box sx={{ position: 'relative' }}>
          <DroppableHeaderTrigger onDragOver={onFolderDragOver}>
            <Box
              component="button"
              type="button"
              onClick={onOpenFolderModal}
              disabled={isTrashView}
              title={typeof foldersTitleLabel === 'string' ? foldersTitleLabel : undefined}
              sx={{
                ...listToggleSx(isFolderActive),
                ...(draggingFile ? { outline: '2px solid rgba(22,129,24,0.3)', outlineOffset: 2 } : {}),
              }}
            >
              <Folder style={{ width: 16, height: 16 }} />
              {foldersTitleLabel}
            </Box>
          </DroppableHeaderTrigger>
        </Box>
        <Box component="button" type="button" onClick={onListChangeActive} sx={listToggleSx(!isTrashView)}>
          <FileText style={{ width: 16, height: 16 }} />
          {tabsAllLabel}
        </Box>
        <Box component="button" type="button" onClick={onListChangeTrash} sx={listToggleSx(isTrashView)}>
          <Trash2 style={{ width: 16, height: 16 }} />
          {tabsTrashLabel}
        </Box>
      </Box>
    </Box>
  );
}

interface StorageSearchInputProps {
  searchQuery: string;
  searchPlaceholder: string;
  searchFilesLabel: string;
  onSearchChange: (value: string) => void;
}

function StorageSearchInput({
  searchQuery,
  searchPlaceholder,
  searchFilesLabel,
  onSearchChange,
}: StorageSearchInputProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box sx={{ position: 'relative', width: { xs: '100%', md: 320 } }} data-tour-id="file-search">
      <Search style={{ width: 16, height: 16, color: c.ink400, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <TextField
        size="small"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchFilesLabel}
        sx={{ width: '100%', '& .MuiOutlinedInput-root': { pl: 4 } }}
      />
    </Box>
  );
}

interface StorageSortSelectProps {
  sortKey: string;
  sortNewest: React.ReactNode;
  sortOldest: React.ReactNode;
  sortNameAsc: React.ReactNode;
  sortNameDesc: React.ReactNode;
  sortBankAsc: React.ReactNode;
  sortBankDesc: React.ReactNode;
  onSortChange: (value: string) => void;
}

function StorageSortSelect({
  sortKey,
  sortNewest,
  sortOldest,
  sortNameAsc,
  sortNameDesc,
  sortBankAsc,
  sortBankDesc,
  onSortChange,
}: StorageSortSelectProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box sx={{ position: 'relative', width: { xs: '100%', md: 224 } }}>
      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value)}
        style={{ width: '100%', border: `1px solid ${c.ink150}`, background: 'var(--card-bg)', padding: '8px 40px 8px 12px', fontSize: 14, color: c.ink900, appearance: 'auto' }}
      >
        <option value="createdAt:desc">{sortNewest}</option>
        <option value="createdAt:asc">{sortOldest}</option>
        <option value="fileName:asc">{sortNameAsc}</option>
        <option value="fileName:desc">{sortNameDesc}</option>
        <option value="bankName:asc">{sortBankAsc}</option>
        <option value="bankName:desc">{sortBankDesc}</option>
      </select>
    </Box>
  );
}

interface StorageFilterButtonProps {
  filtersApplied: boolean;
  filtersButtonLabel: React.ReactNode;
  onOpenFilters: () => void;
}

function StorageFilterButton({
  filtersApplied,
  filtersButtonLabel,
  onOpenFilters,
}: StorageFilterButtonProps): React.JSX.Element {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="button"
        onClick={onOpenFilters}
        data-tour-id="filters-button"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 1,
          border: 'none',
          fontSize: 14,
          fontWeight: 500,
          color: '#fff',
          bgcolor: 'primary.main',
          cursor: 'pointer',
          gap: 1,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <Filter style={{ width: 20, height: 20 }} />
        {filtersButtonLabel}
        {filtersApplied && (
          <Box sx={{ ml: 1, width: 8, height: 8, borderRadius: tokens.radius.full, bgcolor: 'background.paper' }} />
        )}
      </Box>
    </Box>
  );
}
