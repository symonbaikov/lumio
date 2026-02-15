export interface WorkspaceActorEvent {
  workspaceId: string;
  actorId: string;
  actorName: string;
}

export interface StatementUploadedEvent extends WorkspaceActorEvent {
  statementId: string;
  statementName: string;
  bankName?: string;
}

export interface ImportCommittedEvent extends WorkspaceActorEvent {
  statementId?: string;
  transactionCount: number;
}

export interface CategoryChangedEvent extends WorkspaceActorEvent {
  action: 'created' | 'updated' | 'deleted';
  categoryId: string;
  categoryName: string;
}

export interface MemberInvitedEvent extends WorkspaceActorEvent {
  invitedEmail: string;
  role: string;
}

export interface MemberJoinedEvent {
  workspaceId: string;
  memberId: string;
  memberName: string;
}

export interface DataDeletedEvent extends WorkspaceActorEvent {
  entityType: string;
  entityLabel?: string;
  count: number;
}

export interface WorkspaceUpdatedEvent extends WorkspaceActorEvent {
  changedFields: string[];
}

export interface ParsingErrorEvent {
  workspaceId: string;
  userId: string;
  statementId?: string;
  statementName?: string;
  errorMessage: string;
}

export interface ImportFailedEvent {
  workspaceId: string;
  userId: string;
  statementId?: string;
  statementName?: string;
  errorMessage: string;
}

export interface TransactionsUncategorizedEvent {
  workspaceId: string;
  userId: string;
  statementId?: string;
  count: number;
}

export interface ReceiptUncategorizedEvent {
  workspaceId: string;
  userId: string;
  receiptId?: string;
  receiptName?: string;
}
