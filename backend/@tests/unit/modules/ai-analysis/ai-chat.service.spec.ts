import { NotFoundException } from '@nestjs/common';
import { AiChatRole } from '../../../../src/entities';
import { AiChatService } from '../../../../src/modules/ai-analysis/ai-chat.service';

const WORKSPACE = 'ws-1';
const OTHER_WORKSPACE = 'ws-2';
const CHAT_ID = 'chat-1';

function createService() {
  const chats = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: Record<string, unknown>) => ({
      id: CHAT_ID,
      updatedAt: new Date('2026-08-08T00:00:00Z'),
      ...value,
    })),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const messages = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: Record<string, unknown>) => ({ id: 'msg-1', ...value })),
  };

  const service = new AiChatService(chats as never, messages as never);
  return { service, chats, messages };
}

const EXISTING_CHAT = {
  id: CHAT_ID,
  workspaceId: WORKSPACE,
  title: 'Spending',
  modelId: 'Qwen3.5-4B-q4f16_1-MLC',
  updatedAt: new Date('2026-08-08T00:00:00Z'),
};

describe('AiChatService tenant isolation', () => {
  it('filters the chat list by workspace', async () => {
    const { service, chats } = createService();
    chats.find.mockResolvedValue([]);

    await service.list(WORKSPACE);

    expect(chats.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE } }),
    );
  });

  it.each([
    ['get', (service: AiChatService) => service.get(OTHER_WORKSPACE, CHAT_ID)],
    [
      'appendMessage',
      (service: AiChatService) =>
        service.appendMessage(OTHER_WORKSPACE, CHAT_ID, AiChatRole.USER, 'hi'),
    ],
    ['rename', (service: AiChatService) => service.rename(OTHER_WORKSPACE, CHAT_ID, 'x')],
    ['remove', (service: AiChatService) => service.remove(OTHER_WORKSPACE, CHAT_ID)],
  ])('refuses %s for a chat in another workspace', async (_label, call) => {
    const { service, chats } = createService();
    // The repository returns nothing because the workspace filter excludes it.
    chats.findOne.mockResolvedValue(null);

    await expect(call(service)).rejects.toThrow(NotFoundException);
  });

  it('always constrains the lookup by workspace, never by id alone', async () => {
    const { service, chats } = createService();
    chats.findOne.mockResolvedValue(EXISTING_CHAT);

    await service.get(WORKSPACE, CHAT_ID);

    expect(chats.findOne).toHaveBeenCalledWith({
      where: { id: CHAT_ID, workspaceId: WORKSPACE },
    });
  });

  it('reads messages scoped to the workspace as well as the chat', async () => {
    const { service, chats, messages } = createService();
    chats.findOne.mockResolvedValue(EXISTING_CHAT);

    await service.get(WORKSPACE, CHAT_ID);

    expect(messages.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chatId: CHAT_ID, workspaceId: WORKSPACE } }),
    );
  });

  it('stamps a stored message with the workspace of its chat', async () => {
    const { service, chats, messages } = createService();
    chats.findOne.mockResolvedValue(EXISTING_CHAT);

    await service.appendMessage(WORKSPACE, CHAT_ID, AiChatRole.ASSISTANT, 'answer');

    expect(messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE, chatId: CHAT_ID }),
    );
  });
});

describe('AiChatService behaviour', () => {
  it('soft deletes rather than removing the row', async () => {
    const { service, chats } = createService();
    chats.findOne.mockResolvedValue(EXISTING_CHAT);

    await service.remove(WORKSPACE, CHAT_ID);

    expect(chats.softDelete).toHaveBeenCalledWith({ id: CHAT_ID, workspaceId: WORKSPACE });
  });

  it('names a new chat after the first question', async () => {
    const { service } = createService();

    const chat = await service.create(WORKSPACE, 'user-1', 'model-x', '  Сколько   я потратил?  ');

    expect(chat.title).toBe('Сколько я потратил?');
  });

  it('truncates a long first question instead of storing a paragraph', async () => {
    const { service } = createService();

    const chat = await service.create(WORKSPACE, 'user-1', 'model-x', 'a'.repeat(500));

    expect(chat.title.length).toBeLessThanOrEqual(60);
  });

  it('falls back to a placeholder when the question is blank', async () => {
    const { service } = createService();

    const chat = await service.create(WORKSPACE, 'user-1', 'model-x', '   ');

    expect(chat.title).toBe('New chat');
  });

  it('bumps the chat so the list orders by real activity', async () => {
    const { service, chats } = createService();
    chats.findOne.mockResolvedValue(EXISTING_CHAT);

    await service.appendMessage(WORKSPACE, CHAT_ID, AiChatRole.USER, 'hi');

    expect(chats.update).toHaveBeenCalledWith(
      { id: CHAT_ID, workspaceId: WORKSPACE },
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});
