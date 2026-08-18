import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiChat, AiChatMessage, AiChatRole } from '../../entities';

export interface ChatSummary {
  id: string;
  title: string;
  modelId: string;
  updatedAt: Date;
}

export interface ChatTranscript extends ChatSummary {
  messages: Array<{
    id: string;
    role: AiChatRole;
    content: string;
    actionPayload: Record<string, unknown> | null;
    createdAt: Date;
  }>;
}

const TITLE_MAX_LENGTH = 255;
/** Enough to recognise the conversation in a list without storing a paragraph. */
const TITLE_FROM_QUESTION_LENGTH = 60;

@Injectable()
export class AiChatService {
  constructor(
    @InjectRepository(AiChat)
    private readonly chats: Repository<AiChat>,
    @InjectRepository(AiChatMessage)
    private readonly messages: Repository<AiChatMessage>,
  ) {}

  async list(workspaceId: string): Promise<ChatSummary[]> {
    const rows = await this.chats.find({
      where: { workspaceId },
      order: { updatedAt: 'DESC' },
    });

    return rows.map(row => this.toSummary(row));
  }

  async create(
    workspaceId: string,
    userId: string,
    modelId: string,
    firstQuestion: string,
  ): Promise<ChatSummary> {
    const chat = await this.chats.save(
      this.chats.create({
        workspaceId,
        createdById: userId,
        modelId,
        title: this.titleFrom(firstQuestion),
      }),
    );

    return this.toSummary(chat);
  }

  async get(workspaceId: string, chatId: string): Promise<ChatTranscript> {
    const chat = await this.requireChat(workspaceId, chatId);

    const messages = await this.messages.find({
      where: { chatId: chat.id, workspaceId },
      order: { createdAt: 'ASC' },
    });

    return {
      ...this.toSummary(chat),
      messages: messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        actionPayload: message.actionPayload ?? null,
        createdAt: message.createdAt,
      })),
    };
  }

  async appendMessage(
    workspaceId: string,
    chatId: string,
    role: AiChatRole,
    content: string,
    actionPayload?: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const chat = await this.requireChat(workspaceId, chatId);

    const message = await this.messages.save(
      this.messages.create({
        chatId: chat.id,
        workspaceId,
        role,
        content,
        actionPayload: actionPayload ?? null,
      }),
    );

    // Keeps the list ordered by real activity rather than by creation.
    await this.chats.update({ id: chat.id, workspaceId }, { updatedAt: new Date() });

    return { id: message.id };
  }

  async rename(workspaceId: string, chatId: string, title: string): Promise<ChatSummary> {
    const chat = await this.requireChat(workspaceId, chatId);
    chat.title = this.titleFrom(title);

    return this.toSummary(await this.chats.save(chat));
  }

  async remove(workspaceId: string, chatId: string): Promise<void> {
    await this.requireChat(workspaceId, chatId);
    // Soft delete: business data per .claude/rules/database.md.
    await this.chats.softDelete({ id: chatId, workspaceId });
  }

  /**
   * Every read goes through here so no query can reach a chat without the
   * workspace filter. A chat from another tenant is "not found", not "forbidden",
   * so the response does not confirm that the id exists.
   */
  private async requireChat(workspaceId: string, chatId: string): Promise<AiChat> {
    const chat = await this.chats.findOne({ where: { id: chatId, workspaceId } });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  private titleFrom(text: string): string {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    if (trimmed === '') {
      return 'New chat';
    }

    return trimmed.slice(0, Math.min(TITLE_FROM_QUESTION_LENGTH, TITLE_MAX_LENGTH));
  }

  private toSummary(chat: AiChat): ChatSummary {
    return {
      id: chat.id,
      title: chat.title,
      modelId: chat.modelId,
      updatedAt: chat.updatedAt,
    };
  }
}
