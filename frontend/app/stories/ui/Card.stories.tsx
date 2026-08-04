import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default card
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Заголовок карточки</CardTitle>
        <CardDescription>Описание карточки с дополнительной информацией</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Содержимое карточки. Здесь может быть любой контент.</p>
      </CardContent>
    </Card>
  ),
};

// Card with footer
export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Настройки</CardTitle>
        <CardDescription>Управление настройками аккаунта</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Выберите параметры для настройки вашего аккаунта.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Отмена</Button>
        <Button>Сохранить</Button>
      </CardFooter>
    </Card>
  ),
};

// Stats card
export const StatsCard: Story = {
  render: () => (
    <Card className="w-[200px]">
      <CardHeader className="pb-2">
        <CardDescription>Всего транзакций</CardDescription>
        <CardTitle className="text-3xl">1,234</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-green-600">+12% с прошлого месяца</p>
      </CardContent>
    </Card>
  ),
};

// Card grid
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Расходы</CardDescription>
          <CardTitle className="text-2xl text-red-600">$1,500,000</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Доходы</CardDescription>
          <CardTitle className="text-2xl text-green-600">$2,300,000</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Баланс</CardDescription>
          <CardTitle className="text-2xl">$800,000</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
};

// Empty state card
export const EmptyState: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <CardTitle className="mb-2">Нет данных</CardTitle>
        <CardDescription className="mb-4">
          Загрузите первую выписку для начала работы
        </CardDescription>
        <Button>Загрузить выписку</Button>
      </CardContent>
    </Card>
  ),
};

// Long content
export const LongContent: Story = {
  render: () => (
    <Card className="w-[400px] max-h-[300px] overflow-y-auto">
      <CardHeader>
        <CardTitle>Длинное содержимое</CardTitle>
        <CardDescription>Карточка с прокруткой</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i}>
            Параграф {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        ))}
      </CardContent>
    </Card>
  ),
};
