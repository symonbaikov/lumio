import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ColumnsDrawer } from '../../(main)/statements/components/columns/ColumnsDrawer';
import {
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumn,
} from '../../(main)/statements/components/columns/statement-columns';
import { Button } from '../../components/ui/button';

const meta: Meta<typeof ColumnsDrawer> = {
  title: 'Statements/ColumnsDrawer',
  component: ColumnsDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const DrawerWrapper = ({
  children,
  buttonText = 'Open columns',
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => ReactNode;
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

export const Default: Story = {
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => {
        const [columns, setColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);

        return (
          <ColumnsDrawer
            open={isOpen}
            onClose={onClose}
            columns={columns}
            onToggle={(id, value) =>
              setColumns((prev) =>
                prev.map((column) =>
                  column.id === id
                    ? {
                        ...column,
                        visible: value,
                      }
                    : column,
                ),
              )
            }
            onSave={onClose}
            labels={{
              title: 'Columns',
              save: 'Save',
            }}
          />
        );
      }}
    </DrawerWrapper>
  ),
};
