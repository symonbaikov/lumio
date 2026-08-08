import { InsightCategory, InsightType } from '../../../../src/entities';
import { AiInsightsController } from '../../../../src/modules/ai-analysis/ai-insights.controller';

const USER = { id: 'user-1' } as never;
const WORKSPACE = 'ws-1';

function createController() {
  const insightsService = { saveExternal: jest.fn().mockResolvedValue({ created: true }) };
  const controller = new AiInsightsController(insightsService as never);
  return { controller, insightsService };
}

const BODY = {
  title: 'Траты на такси выросли',
  message: 'В августе на такси ушло на 40% больше, чем в июле.',
  periodKey: '2026-08',
  modelId: 'Qwen3.5-4B-q4f16_1-MLC',
};

describe('AiInsightsController', () => {
  it('stores the insight for the current user and workspace', async () => {
    const { controller, insightsService } = createController();

    await controller.save(USER, WORKSPACE, BODY);

    expect(insightsService.saveExternal).toHaveBeenCalledWith(
      'user-1',
      WORKSPACE,
      expect.objectContaining({ title: BODY.title, message: BODY.message }),
    );
  });

  it('keys deduplication on the period so reopening the page does not stack rows', async () => {
    const { controller, insightsService } = createController();

    await controller.save(USER, WORKSPACE, BODY);
    await controller.save(USER, WORKSPACE, { ...BODY, message: 'Переписано моделью заново.' });

    const [first, second] = insightsService.saveExternal.mock.calls;
    expect(first[2].deduplicationKey).toBe(second[2].deduplicationKey);
    expect(first[2].deduplicationKey).toBe('ai.summary:2026-08');
  });

  it('separates periods so a new month is a new insight', async () => {
    const { controller, insightsService } = createController();

    await controller.save(USER, WORKSPACE, BODY);
    await controller.save(USER, WORKSPACE, { ...BODY, periodKey: '2026-09' });

    const [first, second] = insightsService.saveExternal.mock.calls;
    expect(first[2].deduplicationKey).not.toBe(second[2].deduplicationKey);
  });

  it('marks the insight as model-written so it is distinguishable from analyzer output', async () => {
    const { controller, insightsService } = createController();

    await controller.save(USER, WORKSPACE, BODY);

    const candidate = insightsService.saveExternal.mock.calls[0][2];
    expect(candidate.type).toBe(InsightType.AI_SUMMARY);
    expect(candidate.category).toBe(InsightCategory.TREND);
    expect(candidate.data).toMatchObject({ source: 'local-model', modelId: BODY.modelId });
  });
});
