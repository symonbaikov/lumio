'use client';

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
import React from 'react';
import type { UserTableRowProps } from './UserTableRow';
import { UserTableRow } from './UserTableRow';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  permissions: string[] | null;
  createdAt: string;
}

const SKELETON_ROW_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'];

export interface UsersTableProps {
  loading: boolean;
  users: User[];
  localeCode: string;
  labels: UserTableRowProps['labels'];
  headerLabels: { key: string; label: React.ReactNode }[];
  onEditPermissions: (user: User) => void;
  onUpdateRole: ({ userId, newRole }: { userId: string; newRole: string }) => void;
  onToggleActive: (user: User) => void;
}

export function UsersTable({
  loading,
  users,
  localeCode,
  labels,
  headerLabels,
  onEditPermissions,
  onUpdateRole,
  onToggleActive,
}: UsersTableProps): React.JSX.Element {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {headerLabels.map(({ key, label }) => (
              <TableCell key={key}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? SKELETON_ROW_KEYS.map(key => (
                <TableRow key={key}>
                  {headerLabels.map(({ key: colKey }) => (
                    <TableCell key={colKey}>
                      <Skeleton variant="text" width="70%" height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : users.map(user => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  localeCode={localeCode}
                  labels={labels}
                  onEditPermissions={onEditPermissions}
                  onUpdateRole={onUpdateRole}
                  onToggleActive={onToggleActive}
                />
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
