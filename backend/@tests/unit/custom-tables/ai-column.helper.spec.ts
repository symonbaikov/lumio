import { AiColumnFiller } from '../../../src/modules/custom-tables/helpers/ai-column.helper';

describe('AiColumnFiller', () => {
  const inputs = [
    { id: 'r1', text: 'Контрагент: Магнум; Сумма: 1500' },
    { id: 'r2', text: 'Контрагент: Аренда; Сумма: 90000' },
  ];

  it('returns empty values when no model is configured instead of inventing them', async () => {
    const filler = new AiColumnFiller();
    jest.spyOn(filler, 'isReady').mockReturnValue(false);
    // isAvailable определяет реальную доступность модели.
    jest
      .spyOn(filler as unknown as { isAvailable: () => boolean }, 'isAvailable')
      .mockReturnValue(false);

    const result = await filler.fill('Определи категорию', inputs);

    // Тихо записать выдуманное в финансовую таблицу хуже, чем не заполнить.
    expect(result).toEqual([
      { id: 'r1', value: null },
      { id: 'r2', value: null },
    ]);
  });

  it('returns nothing for an empty input list without calling the model', async () => {
    const filler = new AiColumnFiller();
    const spy = jest.spyOn(
      filler as unknown as { generateJsonContent: () => Promise<string> },
      'generateJsonContent',
    );

    await expect(filler.fill('prompt', [])).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('maps model answers back onto the rows that asked for them', async () => {
    const filler = new AiColumnFiller();
    jest
      .spyOn(filler as unknown as { isAvailable: () => boolean }, 'isAvailable')
      .mockReturnValue(true);
    jest
      .spyOn(
        filler as unknown as { generateJsonContent: () => Promise<string> },
        'generateJsonContent',
      )
      .mockResolvedValue(
        JSON.stringify({ results: [{ id: 'r2', value: 'Аренда' }, { id: 'r1', value: 'Продукты' }] }),
      );

    const result = await filler.fill('Определи категорию', inputs);

    expect(result).toEqual([
      { id: 'r1', value: 'Продукты' },
      { id: 'r2', value: 'Аренда' },
    ]);
  });

  it('leaves rows the model skipped empty rather than shifting answers', async () => {
    const filler = new AiColumnFiller();
    jest
      .spyOn(filler as unknown as { isAvailable: () => boolean }, 'isAvailable')
      .mockReturnValue(true);
    jest
      .spyOn(
        filler as unknown as { generateJsonContent: () => Promise<string> },
        'generateJsonContent',
      )
      .mockResolvedValue(JSON.stringify({ results: [{ id: 'r1', value: 'Продукты' }] }));

    const result = await filler.fill('prompt', inputs);

    expect(result[1]).toEqual({ id: 'r2', value: null });
  });

  it('survives malformed model output', async () => {
    const filler = new AiColumnFiller();
    jest
      .spyOn(filler as unknown as { isAvailable: () => boolean }, 'isAvailable')
      .mockReturnValue(true);
    jest
      .spyOn(
        filler as unknown as { generateJsonContent: () => Promise<string> },
        'generateJsonContent',
      )
      .mockResolvedValue('не json');

    await expect(filler.fill('prompt', inputs)).resolves.toEqual([
      { id: 'r1', value: null },
      { id: 'r2', value: null },
    ]);
  });

  it('caps a long answer instead of writing it whole into a cell', async () => {
    const filler = new AiColumnFiller();
    jest
      .spyOn(filler as unknown as { isAvailable: () => boolean }, 'isAvailable')
      .mockReturnValue(true);
    jest
      .spyOn(
        filler as unknown as { generateJsonContent: () => Promise<string> },
        'generateJsonContent',
      )
      .mockResolvedValue(
        JSON.stringify({ results: [{ id: 'r1', value: 'x'.repeat(1000) }] }),
      );

    const result = await filler.fill('prompt', [inputs[0]]);

    expect(result[0].value).toHaveLength(200);
  });
});
