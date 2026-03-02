'use client';

import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Spinner } from '@/app/components/ui/spinner';
import apiClient from '@/app/lib/api';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load duplicates');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark duplicates');
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Duplicate Transactions</h1>
            <p className="text-muted-foreground mt-2">
              Review and manage duplicate transactions detected across statements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDetect} disabled={detecting}>
              {detecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-detect
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Groups</p>
                <p className="text-2xl font-bold">
                  {loading ? <Spinner className="size-4" /> : duplicateGroups.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">
                  {loading ? <Spinner className="size-4" /> : selectedGroups.size}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Duplicates</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Spinner className="size-4" />
                  ) : (
                    duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0)
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedGroups.size === duplicateGroups.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={handleMarkDuplicates}
                disabled={selectedGroups.size === 0 || marking}
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  `Mark ${selectedGroups.size} Group${selectedGroups.size !== 1 ? 's' : ''} as Duplicate`
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Duplicate Groups */}
      {loading ? (
        <Card className="p-12 text-center">
          <Spinner className="size-6 text-primary" />
          <h3 className="mt-4 text-sm font-medium text-muted-foreground">Loading duplicates...</h3>
        </Card>
      ) : duplicateGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold mb-2">No Duplicates Found</h3>
          <p className="text-muted-foreground">
            All transactions appear to be unique. Click "Re-detect" to scan again.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map(group => (
            <DuplicateGroupCard
              key={group.master.id}
              group={group}
              selected={selectedGroups.has(group.master.id)}
              onToggle={() => handleToggleGroup(group.master.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
