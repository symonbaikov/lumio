import { StoicPhrasingService } from '@/modules/insights/stoic-phrasing.service';

const item = {
  id: 'stoic:praise:ws-1:2026-09',
  messageKey: 'stoic.praise_steady',
  facts: {},
  draft: { title: 'Nothing to correct', message: 'Keep going.' },
};

function serviceWith(content: string | Error, configured = true) {
  const chat = {
    isConfigured: jest.fn(async () => ({ configured })),
    complete: jest.fn(async () => {
      if (content instanceof Error) {
        throw content;
      }
      return { content, model: 'm', usage: {} };
    }),
  };
  return { service: new StoicPhrasingService(chat as any), chat };
}

describe('StoicPhrasingService', () => {
  it('returns the model text per item', async () => {
    const { service } = serviceWith(
      JSON.stringify({
        [item.id]: { title: 'Steady hand', message: 'Well done.' },
      }),
    );

    const phrased = await service.phrase('ws-1', 'user-1', 'en', [item]);

    expect(phrased.get(item.id)).toEqual({
      title: 'Steady hand',
      message: 'Well done.',
    });
  });

  it('accepts an answer wrapped in a code fence', async () => {
    const { service } = serviceWith(
      `\`\`\`json\n${JSON.stringify({ [item.id]: { title: 'T', message: 'M' } })}\n\`\`\``,
    );

    expect((await service.phrase('ws-1', 'user-1', 'en', [item])).size).toBe(1);
  });

  it('does not call the model without a configured key', async () => {
    const { service, chat } = serviceWith('{}', false);

    expect((await service.phrase('ws-1', 'user-1', 'en', [item])).size).toBe(0);
    expect(chat.complete).not.toHaveBeenCalled();
  });

  it('falls back quietly on a failed request or broken JSON', async () => {
    expect(
      (await serviceWith(new Error('boom')).service.phrase('ws-1', 'user-1', 'en', [item])).size,
    ).toBe(0);
    expect(
      (await serviceWith('not json').service.phrase('ws-1', 'user-1', 'en', [item])).size,
    ).toBe(0);
  });

  it('drops entries that are empty or too long', async () => {
    const { service } = serviceWith(
      JSON.stringify({ [item.id]: { title: '', message: 'x'.repeat(1000) } }),
    );

    expect((await service.phrase('ws-1', 'user-1', 'en', [item])).size).toBe(0);
  });

  it('sends the facts as data in a user turn, after a single system prompt', async () => {
    const { service, chat } = serviceWith('{}');

    await service.phrase('ws-1', 'user-1', 'ru', [item]);

    const messages = (chat.complete.mock.calls[0] as unknown[])[2] as Array<{
      role: string;
      content: string;
    }>;
    expect(messages.map(message => message.role)).toEqual(['system', 'user']);
    expect(messages[0].content).toContain('locale code: ru');
    expect(JSON.parse(messages[1].content)[0]).toMatchObject({
      id: item.id,
      kind: item.messageKey,
    });
  });
});
