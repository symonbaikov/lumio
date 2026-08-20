'use client';

import { RefreshCw } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import DuplicateGroupCard from './components/DuplicateGroupCard';

interface DuplicateTransaction {
  id: string;
  date: string;
  amount: number;
  counterparty: string;
  purpose: string;
  statementId: string;
  similarity?: number;
  matchType?: string;
  matchedFields?: string[];
}

interface DuplicateGroup {
  master: DuplicateTransaction;
  duplicates: DuplicateTransaction[];
  confidence: number;
}

interface DuplicatesResponse {
  totalGroups: number;
  groups: DuplicateGroup[];
}

function DuplicateGroupsContent({
  loading,
  duplicateGroups,
  selectedGroups,
  onToggleGroup,
}: {
  loading: boolean;
  duplicateGroups: DuplicateGroup[];
  selectedGroups: Set<string>;
  onToggleGroup: (masterId: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      ) : duplicateGroups.length === 0 ? (
        <Typography variant="body2" sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          No duplicate groups found
        </Typography>
      ) : (
        duplicateGroups.map(group => (
          <DuplicateGroupCard
            key={group.master.id}
            group={group}
            selected={selectedGroups.has(group.master.id)}
            onToggle={() => onToggleGroup(group.master.id)}
          />
        ))
      )}
    </Box>
  );
}

export default function TransactionDuplicatesPage() {
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<DuplicatesResponse>('/transactions/duplicates/detect', {
        params: {
          threshold: 0.85,
        },
      });
      setDuplicateGroups(response.data.groups);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to load duplicates'));
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    setDetecting(true);
    await loadDuplicates();
    setDetecting(false);
  };

  const handleToggleGroup = (masterId: string) => {
    const next = new Set(selectedGroups);
    if (next.has(masterId)) {
      next.delete(masterId);
    } else {
      next.add(masterId);
    }
    setSelectedGroups(next);
  };

  const handleMarkDuplicates = async () => {
    if (selectedGroups.size === 0) {
      setError('Please select at least one duplicate group to mark');
      return;
    }

    try {
      setMarking(true);
      setError(null);

      const groupsToMark = duplicateGroups
        .filter(g => selectedGroups.has(g.master.id))
        .map(g => ({
          masterId: g.master.id,
          duplicateIds: g.duplicates.map(d => d.id),
        }));

      const response = await apiClient.post('/transactions/duplicates/mark', {
        groups: groupsToMark,
      });

      setSuccess(`Successfully marked ${response.data.markedCount} transactions as duplicates`);
      setSelectedGroups(new Set());
      await loadDuplicates(); // Reload to update the list
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to mark duplicates'));
    } finally {
      setMarking(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === duplicateGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(duplicateGroups.map(g => g.master.id)));
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: 2, py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Duplicate Transactions
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Review and manage duplicate transactions detected across statements
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleDetect}
              disabled={detecting}
              startIcon={detecting ? <Spinner size={16} /> : <RefreshCw size={16} />}
            >
              {detecting ? 'Detecting...' : 'Re-detect'}
            </Button>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Summary Card */}
        <Box
          sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 3, mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Total Groups
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {loading ? <Spinner size={16} /> : duplicateGroups.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Selected
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {loading ? <Spinner size={16} /> : selectedGroups.size}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Total Duplicates
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {loading ? (
                    <Spinner size={16} />
                  ) : (
                    duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0)
                  )}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={handleSelectAll}>
                {selectedGroups.size === duplicateGroups.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="contained"
                onClick={handleMarkDuplicates}
                disabled={selectedGroups.size === 0 || marking}
                startIcon={marking ? <Spinner size={16} /> : undefined}
              >
                {marking
                  ? 'Marking...'
                  : `Mark ${selectedGroups.size} Group${selectedGroups.size !== 1 ? 's' : ''} as Duplicate`}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Duplicate Groups */}
      <DuplicateGroupsContent
        loading={loading}
        duplicateGroups={duplicateGroups}
        selectedGroups={selectedGroups}
        onToggleGroup={handleToggleGroup}
      />
    </Box>
  );
}
