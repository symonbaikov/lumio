import type { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORY_NAME_MAP: ReadonlyArray<{ from: string; to: string; type: 'income' | 'expense' }> = [
  { from: 'Sales', to: 'Продажи', type: 'income' },
  { from: 'Services', to: 'Услуги', type: 'income' },
  { from: 'Interest Income', to: 'Процентный доход', type: 'income' },
  { from: 'Other Income', to: 'Прочий доход', type: 'income' },
  { from: 'Advertising', to: 'Реклама', type: 'expense' },
  { from: 'Benefits', to: 'Льготы и компенсации', type: 'expense' },
  { from: 'Car', to: 'Автомобильные расходы', type: 'expense' },
  { from: 'Equipment', to: 'Оборудование', type: 'expense' },
  { from: 'Fees', to: 'Комиссии и сборы', type: 'expense' },
  { from: 'Home Office', to: 'Домашний офис', type: 'expense' },
  { from: 'Insurance', to: 'Страхование', type: 'expense' },
  { from: 'Interest', to: 'Проценты', type: 'expense' },
  { from: 'Labor', to: 'Оплата труда', type: 'expense' },
  { from: 'Maintenance', to: 'Обслуживание и ремонт', type: 'expense' },
  { from: 'Materials', to: 'Материалы', type: 'expense' },
  {
    from: 'Meals and Entertainment',
    to: 'Питание и представительские расходы',
    type: 'expense',
  },
  { from: 'Office Supplies', to: 'Канцелярские товары', type: 'expense' },
  { from: 'Other', to: 'Прочие расходы', type: 'expense' },
  { from: 'Professional Services', to: 'Профессиональные услуги', type: 'expense' },
  { from: 'Rent', to: 'Аренда', type: 'expense' },
  { from: 'Taxes', to: 'Налоги', type: 'expense' },
  { from: 'Travel', to: 'Командировки', type: 'expense' },
  { from: 'Utilities', to: 'Коммунальные услуги', type: 'expense' },
];

export class LocalizeSystemCategoriesToRussian1763400000000 implements MigrationInterface {
  name = 'LocalizeSystemCategoriesToRussian1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const mapping of CATEGORY_NAME_MAP) {
      await queryRunner.query(
        `
          UPDATE "categories"
          SET "name" = $1,
              "updated_at" = NOW()
          WHERE "name" = $2
            AND "type" = $3
        `,
        [mapping.to, mapping.from, mapping.type],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const mapping of CATEGORY_NAME_MAP) {
      await queryRunner.query(
        `
          UPDATE "categories"
          SET "name" = $1,
              "updated_at" = NOW()
          WHERE "name" = $2
            AND "type" = $3
        `,
        [mapping.from, mapping.to, mapping.type],
      );
    }
  }
}
