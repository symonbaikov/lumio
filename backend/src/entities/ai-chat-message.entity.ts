import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiChat } from './ai-chat.entity';
import { Workspace } from './workspace.entity';

export enum AiChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/**
 * One turn of a conversation.
 *
 * `workspace_id` is denormalised from the parent chat on purpose: every read
 * filters by workspace, and carrying the column here means a message can never
 * be fetched without that filter being expressible on the message table itself.
 */
@Entity('ai_chat_messages')
@Index('IDX_ai_chat_messages_chat_created', ['chatId', 'createdAt'])
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AiChat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: AiChat;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'enum', enum: AiChatRole })
  role: AiChatRole;

  @Column({ type: 'text' })
  content: string;

  /**
   * Structured record of a chat-mode action turn (intent name, params, outcome).
   * Null for plain user/assistant text messages.
   */
  @Column({ name: 'action_payload', type: 'jsonb', nullable: true })
  actionPayload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
