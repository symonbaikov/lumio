/** Action helpers for useStatementSelection hook. */
import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import type React from 'react';
import toast from 'react-hot-toast';
import {
  DUPLICATE_GROUP_TONES,
  type DuplicateGroupTone,
  type StatementLike,
  getBulkActionErrorOptions,
  getDeleteEndpoint,
  getExportEndpoint,
  isGmailStatement,
} from '../StatementsListView.utils';
import type { DuplicateMeta, DuplicateOverride } from './useStatementSelection';

export type SetDuplicateOverrides = React.Dispatch<React.SetStateAction<Record<string, DuplicateOverride>>>;
export type RefreshFn = (opts?: { silent?: boolean; showErrorToast?: boolean; search?: string }) => Promise<void>;
export type GmailRefreshFn = (opts?: { silent?: boolean; showErrorToast?: boolean }) => Promise<void>;

export type ExportParams = { selectedStatementIds: string[]; displayStatements: StatementLike[]; setSelectedActionsOpen: (v: boolean) => void };
export type DeleteParams = { selectedStatementIds: string[]; displayStatements: StatementLike[]; search: string; setSelectedStatementIds: React.Dispatch<React.SetStateAction<string[]>>; setSelectedActionsOpen: (v: boolean) => void; onRefreshStatements: RefreshFn };
export type DuplicateMarkParams = { selectedStatementIds: string[]; setDuplicateOverrides: SetDuplicateOverrides; setSelectedActionsOpen: (v: boolean) => void };
export type MergeParams = { selectedStatementIds: string[]; displayStatements: StatementLike[]; duplicateMetaById: Map<string, DuplicateMeta>; stage: string; search: string; setDuplicateOverrides: SetDuplicateOverrides; setSelectedStatementIds: React.Dispatch<React.SetStateAction<string[]>>; setSelectedActionsOpen: (v: boolean) => void; onRefreshStatements: RefreshFn; onRefreshGmail: GmailRefreshFn };

const downloadStatement = async (statement: StatementLike): Promise<'ok' | 'fail'> => {
  try {
    const response = await apiClient.get(getExportEndpoint(statement), { responseType: 'blob' });
    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (statement as { fileName?: string }).fileName ?? `${statement.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return 'ok';
  } catch {
    return 'fail';
  }
};

export const runExportSelected = async (params: ExportParams): Promise<void> => {
  const { selectedStatementIds, displayStatements, setSelectedActionsOpen } = params;
  if (selectedStatementIds.length === 0) return;
  try {
    const exportable = displayStatements.filter(s => selectedStatementIds.includes(s.id));
    if (exportable.length === 0) return;
    const results = await Promise.allSettled(exportable.map(downloadStatement));
    const exportedCount = results.filter(r => r.status === 'fulfilled' && r.value === 'ok').length;
    const failedCount = results.filter(r => r.status === 'fulfilled' && r.value === 'fail').length;
    if (exportedCount === 0) { toast.error('Failed to export selected statements'); return; }
    toast.success(failedCount > 0 ? `Exported ${exportedCount} statement(s), ${failedCount} failed` : `Exported ${exportedCount} statement(s)`);
    setSelectedActionsOpen(false);
  } catch {
    toast.error('Failed to export selected statements');
  }
};

const processDeleteResults = (
  results: PromiseSettledResult<unknown>[],
  deletable: StatementLike[],
): { deletedIds: string[]; failedIds: string[] } => {
  const deletedIds: string[] = [];
  const failedIds: string[] = [];
  results.forEach((result, index) => {
    const id = deletable[index]?.id;
    if (!id) return;
    if (result.status === 'fulfilled') { deletedIds.push(id); return; }
    const status = getApiErrorStatus(result.reason);
    if (status === 404 || status === 410) { deletedIds.push(id); return; }
    failedIds.push(id);
  });
  return { deletedIds, failedIds };
};

const executeDeleteStatements = async (deletable: StatementLike[], deleteParams: DeleteParams): Promise<void> => {
  const { search, setSelectedStatementIds, setSelectedActionsOpen, onRefreshStatements } = deleteParams;
  const results = await Promise.allSettled(deletable.map(s => apiClient.delete(getDeleteEndpoint(s))));
  const { deletedIds, failedIds } = processDeleteResults(results, deletable);
  if (deletedIds.length === 0) { toast.error('Failed to delete selected statements'); return; }
  setSelectedStatementIds(prev => prev.filter(id => !deletedIds.includes(id)));
  setSelectedActionsOpen(false);
  await onRefreshStatements({ search, showErrorToast: false });
  toast.success(failedIds.length > 0 ? `Moved ${deletedIds.length} statement(s) to trash, ${failedIds.length} failed` : 'Selected statements moved to trash');
};

export const runDeleteSelected = async (deleteParams: DeleteParams): Promise<void> => {
  const { selectedStatementIds, displayStatements, setSelectedActionsOpen } = deleteParams;
  if (selectedStatementIds.length === 0) return;
  const deletable = displayStatements.filter(s => selectedStatementIds.includes(s.id));
  if (deletable.length === 0) return;
  if (!window.confirm(`Move ${deletable.length} selected item(s) to trash?`)) return;
  try {
    await executeDeleteStatements(deletable, deleteParams);
  } catch {
    toast.error('Failed to delete selected statements');
  }
};

export const runMarkSelectedAsDuplicate = (p: DuplicateMarkParams): void => {
  if (p.selectedStatementIds.length === 0) return;
  p.setDuplicateOverrides(prev => {
    const next = { ...prev };
    const manualGroupIndex = Object.values(prev).filter(o => o.groupKey?.startsWith('manual-group:')).length;
    const groupKey = `manual-group:${Date.now()}:${manualGroupIndex}`;
    const groupLabel = `Group Manual ${manualGroupIndex + 1}`;
    const groupTone: DuplicateGroupTone = DUPLICATE_GROUP_TONES[manualGroupIndex % DUPLICATE_GROUP_TONES.length];
    const primaryId = p.selectedStatementIds[0];
    const total = p.selectedStatementIds.length;
    p.selectedStatementIds.forEach((id, index) => {
      next[id] = { state: 'duplicate', groupKey, groupLabel, groupTone, primaryId, position: index + 1, total };
    });
    return next;
  });
  toast.success(`Marked ${p.selectedStatementIds.length} item(s) as duplicate`);
  p.setSelectedActionsOpen(false);
};

export const runDismissSelectedDuplicates = (p: DuplicateMarkParams): void => {
  if (p.selectedStatementIds.length === 0) return;
  p.setDuplicateOverrides(prev => {
    const next = { ...prev };
    p.selectedStatementIds.forEach(id => { next[id] = { state: 'not_duplicate' }; });
    return next;
  });
  toast.success(`Dismissed duplicate flags for ${p.selectedStatementIds.length} item(s)`);
  p.setSelectedActionsOpen(false);
};

type MergeTargets = { statementsToDelete: Set<string>; gmailToMark: Map<string, string>; skippedGmailCount: number };
type MergeResult = { deletedStatementIds: string[]; markedGmailIds: string[]; failedStatements: number; failedGmail: number };

const buildMergeTargets = (selectedDuplicates: StatementLike[], displayStatements: StatementLike[], duplicateMetaById: Map<string, DuplicateMeta>): MergeTargets => {
  const statementById = new Map(displayStatements.map(s => [s.id, s]));
  const statementsToDelete = new Set<string>();
  const gmailToMark = new Map<string, string>();
  let skippedGmailCount = 0;
  selectedDuplicates.forEach(s => {
    const meta = duplicateMetaById.get(s.id);
    if (!meta || s.id === meta.primaryId) return;
    if (isGmailStatement(s)) {
      const primary = statementById.get(meta.primaryId);
      if (primary && isGmailStatement(primary)) { gmailToMark.set(s.id, primary.id); }
      else { skippedGmailCount += 1; }
      return;
    }
    statementsToDelete.add(s.id);
  });
  return { statementsToDelete, gmailToMark, skippedGmailCount };
};

const executeMerge = async (statementIds: string[], gmailEntries: [string, string][]): Promise<MergeResult> => {
  const [deleteResults, gmailResults] = await Promise.all([
    Promise.allSettled(statementIds.map(id => apiClient.delete(`/statements/${id}`))),
    Promise.allSettled(gmailEntries.map(([r, o]) => gmailReceiptsApi.markDuplicate(r, o))),
  ]);
  const deletedStatementIds: string[] = [];
  const markedGmailIds: string[] = [];
  let failedStatements = 0;
  let failedGmail = 0;
  deleteResults.forEach((result, i) => {
    const id = statementIds[i];
    if (!id) return;
    if (result.status === 'fulfilled') { deletedStatementIds.push(id); return; }
    const status = getApiErrorStatus(result.reason);
    if (status === 404 || status === 410) { deletedStatementIds.push(id); return; }
    failedStatements += 1;
  });
  gmailResults.forEach((result, i) => {
    const receiptId = gmailEntries[i]?.[0];
    if (!receiptId) return;
    if (result.status === 'fulfilled') { markedGmailIds.push(receiptId); return; }
    failedGmail += 1;
  });
  return { deletedStatementIds, markedGmailIds, failedStatements, failedGmail };
};

const buildMergeToastMessage = (result: MergeResult, skipped: number): string => {
  const skipHint = skipped > 0 ? ` ${skipped} Gmail item(s) skipped because primary record is not Gmail.` : '';
  const failureHint = result.failedStatements || result.failedGmail
    ? ` ${result.failedGmail} receipt(s) and ${result.failedStatements} statement(s) failed.`
    : '';
  return `Merged duplicates: ${result.markedGmailIds.length} receipt(s), ${result.deletedStatementIds.length} statement(s).${skipHint}${failureHint}`;
};

const applyMergeSuccess = async (p: MergeParams, result: MergeResult, skippedCount: number): Promise<void> => {
  p.setDuplicateOverrides(prev => {
    const next = { ...prev };
    result.markedGmailIds.forEach(id => { next[id] = { state: 'duplicate' }; });
    return next;
  });
  const processedIds = new Set([...result.deletedStatementIds, ...result.markedGmailIds]);
  p.setSelectedStatementIds(prev => prev.filter(id => !processedIds.has(id)));
  p.setSelectedActionsOpen(false);
  await p.onRefreshStatements({ silent: true, search: p.search, showErrorToast: false });
  if (p.stage === 'submit') await p.onRefreshGmail({ silent: true, showErrorToast: false });
  toast.success(buildMergeToastMessage(result, skippedCount));
};

const validateMergeSelection = (p: MergeParams): StatementLike[] | null => {
  if (p.selectedStatementIds.length < 2) { toast.error('Select at least 2 items to merge duplicates'); return null; }
  const selected = p.displayStatements.filter(s => p.selectedStatementIds.includes(s.id));
  const selectedDuplicates = selected.filter(s => p.duplicateMetaById.has(s.id));
  if (selectedDuplicates.length < 2) { toast.error('Select at least 2 detected duplicates to merge'); return null; }
  return selectedDuplicates;
};

const confirmAndExecuteMerge = async (p: MergeParams, targets: MergeTargets, skippedCount: number): Promise<void> => {
  const msg = `Merge selected duplicates? Keep primary records, merge ${targets.gmailToMark.size} receipt(s) and move ${targets.statementsToDelete.size} statement(s) to trash.`;
  if (!window.confirm(msg)) return;
  try {
    const result = await executeMerge(Array.from(targets.statementsToDelete), Array.from(targets.gmailToMark.entries()));
    if (result.deletedStatementIds.length === 0 && result.markedGmailIds.length === 0) {
      toast.error('Failed to merge selected duplicates'); return;
    }
    await applyMergeSuccess(p, result, skippedCount);
  } catch {
    toast.error('Failed to merge selected duplicates');
  }
};

export const runMergeSelectedDuplicates = async (p: MergeParams): Promise<void> => {
  const selectedDuplicates = validateMergeSelection(p);
  if (!selectedDuplicates) return;
  const targets = buildMergeTargets(selectedDuplicates, p.displayStatements, p.duplicateMetaById);
  if (targets.statementsToDelete.size === 0 && targets.gmailToMark.size === 0) {
    toast.error('No mergeable duplicates found in selected items'); return;
  }
  await confirmAndExecuteMerge(p, targets, targets.skippedGmailCount);
};
