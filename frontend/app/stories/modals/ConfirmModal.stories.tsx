import { Button } from '@/app/components/ui/button';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * ConfirmModalContent - Pure presentational component for confirmation dialogs
 * Extracted from ConfirmModal for Storybook testing without dependencies
 */
interface ConfirmModalContentProps {
  title: string;
  message: React.ReactNode;
  isDestructive?: boolean;
}

function ConfirmModalContent({ title, message, isDestructive = false }: ConfirmModalContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
        >
          <AlertTriangle size={20} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="text-gray-600 leading-relaxed">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </div>
  );
}

// Story meta
const meta: Meta<typeof ConfirmModalContent> = {
  title: 'Modals/ConfirmModal',
  component: ConfirmModalContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper
const ModalWrapper = ({
  children,
  buttonText = 'Открыть подтверждение',
  buttonVariant = 'default' as const,
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
  buttonText?: string;
  buttonVariant?: 'default' | 'destructive';
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button variant={buttonVariant} onClick={() => setIsOpen(true)}>
        {buttonText}
      </Button>
      {children({ isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

// Default confirmation
export const Default: Story = {
  render: () => (
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Подтвердить"
            />
          }
        >
          <ConfirmModalContent
            title="Подтвердите действие"
            message="Вы уверены, что хотите продолжить? Это действие нельзя будет отменить."
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Destructive confirmation (delete)
export const Destructive: Story = {
  render: () => (
    <ModalWrapper buttonText="Удалить файл" buttonVariant="destructive">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Удалить"
              confirmVariant="destructive"
            />
          }
        >
          <ConfirmModalContent
            title="Удалить файл?"
            message="Файл 'bank_statement_2024.pdf' будет удалён безвозвратно. Все связанные транзакции также будут удалены."
            isDestructive
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Loading state
export const Loading: Story = {
  render: () => (
    <ModalWrapper buttonText="Сохранить изменения">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          closeOnBackdropClick={false}
          closeOnEscape={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={() => {}}
              cancelText="Отмена"
              confirmText="Сохранение..."
              isConfirmLoading
              isConfirmDisabled
            />
          }
        >
          <ConfirmModalContent
            title="Сохранение изменений"
            message="Пожалуйста, подождите. Идёт сохранение ваших изменений..."
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Disabled confirm
export const Disabled: Story = {
  render: () => (
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={() => {}}
              cancelText="Отмена"
              confirmText="Подтвердить"
              isConfirmDisabled
            />
          }
        >
          <ConfirmModalContent
            title="Требуется ввод"
            message="Кнопка подтверждения недоступна, пока не выполнены все условия."
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Long message
export const LongContent: Story = {
  render: () => (
    <ModalWrapper buttonText="Показать условия">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="md"
          contentClassName="max-h-[60vh] overflow-y-auto"
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отклонить"
              confirmText="Принять"
            />
          }
        >
          <ConfirmModalContent
            title="Условия использования"
            message={
              <div className="space-y-4">
                <p>
                  Настоящие Условия использования регулируют доступ к сервису Lumio и
                  использование его функционала. Пожалуйста, внимательно прочитайте условия перед
                  началом работы.
                </p>
                <p>
                  1. Вы соглашаетесь использовать сервис только в законных целях и в соответствии с
                  настоящими Условиями.
                </p>
                <p>
                  2. Вы несёте ответственность за сохранность своих учётных данных и за все
                  действия, совершённые под вашей учётной записью.
                </p>
                <p>
                  3. Мы оставляем за собой право изменять функционал сервиса без предварительного
                  уведомления.
                </p>
                <p>
                  4. Ваши данные обрабатываются в соответствии с Политикой конфиденциальности, с
                  которой вы можете ознакомиться отдельно.
                </p>
                <p>
                  5. При нарушении условий использования мы оставляем за собой право ограничить или
                  прекратить доступ к сервису.
                </p>
              </div>
            }
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// With custom message component
export const WithCustomContent: Story = {
  render: () => (
    <ModalWrapper buttonText="Показать предупреждение">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Продолжить"
            />
          }
        >
          <ConfirmModalContent
            title="Внимание"
            message={
              <div className="space-y-3">
                <p>При удалении будут затронуты следующие элементы:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>25 транзакций</li>
                  <li>3 категории</li>
                  <li>2 общих ссылки</li>
                </ul>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  ⚠️ Это действие необратимо
                </div>
              </div>
            }
            isDestructive
          />
        </ModalShell>
      )}
    </ModalWrapper>
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
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          showCloseButton={false}
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Подтвердить"
            />
          }
        >
          <ConfirmModalContent
            title="Мобильное подтверждение"
            message="Диалог подтверждения на мобильном устройстве."
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};
