'use client';

import { ArrowRight, Calendar, DollarSign, User } from 'lucide-react';
import React, { useState } from 'react';
import { Badge, type BadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';

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

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selected: boolean;
  onToggle: () => void;
}

export default function DuplicateGroupCard({ group, selected, onToggle }: DuplicateGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getConfidenceVariant = (confidence: number): BadgeVariant => {
    if (confidence >= 0.95) return 'success';
    if (confidence >= 0.85) return 'warning';
    return 'destructive';
  };

  const getMatchTypeVariant = (matchType?: string): BadgeVariant => {
    switch (matchType) {
      case 'exact':
        return 'success';
      case 'hybrid':
        return 'info';
      case 'fuzzy':
        return 'warning';
      case 'semantic':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={`p-6 transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-4">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />

        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={getConfidenceVariant(group.confidence)}>
                {Math.round(group.confidence * 100)}% Match
              </Badge>
              <span className="text-sm text-muted-foreground">
                {group.duplicates.length} duplicate{group.duplicates.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {/* Master Transaction */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl mb-4 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] tracking-wider font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                MASTER
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(group.master.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{formatAmount(group.master.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate">{group.master.counterparty}</span>
              </div>
              <div className="text-sm text-muted-foreground truncate">{group.master.purpose}</div>
            </div>
          </div>

          {/* Duplicate Transactions */}
          <div className="space-y-2">
            {group.duplicates.slice(0, expanded ? undefined : 2).map((duplicate, index) => (
              <div
                key={duplicate.id}
                className="bg-card dark:bg-muted/30 p-4 rounded-xl border border-border transition-colors hover:border-destructive/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] tracking-wider font-bold text-destructive dark:text-destructive-foreground uppercase">
                    DUPLICATE {index + 1}
                  </span>
                  {duplicate.matchType && (
                    <Badge variant={getMatchTypeVariant(duplicate.matchType)}>
                      {duplicate.matchType}
                    </Badge>
                  )}
                  {duplicate.similarity && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(duplicate.similarity * 100)}% similar
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(duplicate.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{formatAmount(duplicate.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm truncate">{duplicate.counterparty}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{duplicate.purpose}</div>
                </div>
                {expanded && duplicate.matchedFields && duplicate.matchedFields.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Matched fields:</span>
                    {duplicate.matchedFields.map(field => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!expanded && group.duplicates.length > 2 && (
              <div className="text-center text-sm text-muted-foreground py-2">
                +{group.duplicates.length - 2} more duplicate
                {group.duplicates.length - 2 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
