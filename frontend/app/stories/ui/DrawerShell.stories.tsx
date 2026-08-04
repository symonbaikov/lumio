import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

const meta: Meta<typeof DrawerShell> = {
  title: 'UI/DrawerShell',
  component: DrawerShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['left', 'right'],
    },
    width: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper for stories
const DrawerWrapper = ({
  children,
  buttonText = 'Открыть панель',
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
  buttonText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>{buttonText}</Button>
      {children({ isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

// Default drawer from right
export const Default: Story = {
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали">
          <div className="space-y-4">
            <p className="text-gray-600">
              Боковая панель с деталями. Удобно для отображения дополнительной информации без ухода
              со страницы.
            </p>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Дополнительная информация</p>
            </div>
          </div>
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Left position
export const LeftPosition: Story = {
  render: () => (
    <DrawerWrapper buttonText="Открыть слева">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Навигация" position="left">
          <nav className="space-y-2">
            {['Главная', 'Выписки', 'Отчёты', 'Настройки'].map(item => (
              <button
                key={item}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {item}
              </button>
            ))}
          </nav>
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Width variations
export const Widths: Story = {
  render: () => {
    const [openWidth, setOpenWidth] = useState<string | null>(null);
    return (
      <div className="p-8 flex gap-4 flex-wrap">
        {(['sm', 'md', 'lg', 'xl'] as const).map(width => (
          <Button key={width} onClick={() => setOpenWidth(width)}>
            {width.toUpperCase()}
          </Button>
        ))}
        {(['sm', 'md', 'lg', 'xl'] as const).map(width => (
          <DrawerShell
            key={width}
            isOpen={openWidth === width}
            onClose={() => setOpenWidth(null)}
            title={`Ширина ${width.toUpperCase()}`}
            width={width}
          >
            <p>Ширина панели: {width}</p>
          </DrawerShell>
        ))}
      </div>
    );
  },
};

// Transaction details (realistic example)
export const TransactionDetails: Story = {
  render: () => (
    <DrawerWrapper buttonText="Показать детали транзакции">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <div className="space-y-6">
            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Дата
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">15 января 2024</div>
              </div>
            </div>

            {/* Counterparty */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Контрагент
              </div>
              <div className="text-sm font-bold text-gray-900">ТОО "Пример Компании"</div>
              <div className="mt-1 text-xs text-gray-600">БИН: 123456789012</div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                  Расход
                </div>
                <div className="mt-2 text-lg font-bold text-red-700">$150,000.00</div>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  Приход
                </div>
                <div className="mt-2 text-lg font-bold text-emerald-700">—</div>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Назначение платежа
              </div>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
                Оплата за услуги по договору №123 от 01.01.2024
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <Button className="w-full" variant="outline">
                Изменить категорию
              </Button>
              <Button className="w-full" variant="ghost">
                Игнорировать
              </Button>
            </div>
          </div>
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Long content with scroll
export const LongContent: Story = {
  render: () => (
    <DrawerWrapper buttonText="Открыть с длинным контентом">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Длинное содержимое">
          <div className="space-y-4">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-900">Элемент {i + 1}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            ))}
          </div>
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Мобильная панель">
          <p className="text-gray-600">
            На мобильных устройствах панель занимает всю ширину экрана.
          </p>
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};
