'use client';

import { useEffect, useRef } from 'react';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { Select } from '@/app/components/ui/select';
import type { CreateTableForm } from '../hooks/useCreateTable';
import type { TableCategory } from '../hooks/useTablesList';
import { TABLE_TEMPLATES, type TableTemplateId } from '../templates';

export interface TemplateCard {
  id: TableTemplateId | null;
  name: string;
  description: string;
  columnCount: number;
}

export interface CreateTableDialogLabels {
  title: string;
  name: string;
  namePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  category: string;
  noCategory: string;
  templateLabel: string;
  columnsCount: string;
  blankName: string;
  blankDescription: string;
  templates: Record<TableTemplateId, { name: string; description: string }>;
  submit: string;
  creating: string;
  cancel: string;
}

interface CreateTableDialogProps {
  open: boolean;
  form: CreateTableForm;
  setForm: React.Dispatch<React.SetStateAction<CreateTableForm>>;
  creating: boolean;
  categories: TableCategory[];
  onSubmit: () => void;
  onClose: () => void;
  labels: CreateTableDialogLabels;
}

function TemplatePicker({
  form,
  setForm,
  labels,
}: Pick<CreateTableDialogProps, 'form' | 'setForm' | 'labels'>) {
  const cards: TemplateCard[] = [
    { id: null, name: labels.blankName, description: labels.blankDescription, columnCount: 0 },
    ...TABLE_TEMPLATES.map(template => ({
      id: template.id,
      name: labels.templates[template.id]?.name ?? template.name,
      description: labels.templates[template.id]?.description ?? template.description,
      columnCount: template.columns.length,
    })),
  ];
  return (
    <div className="lumio-ct__field lumio-ct__field--wide">
      <span className="lumio-ct__label">{labels.templateLabel}</span>
      <div className="lumio-ct__templates" role="radiogroup" aria-label={labels.templateLabel}>
        {cards.map(card => (
          <button
            key={card.id ?? 'blank'}
            type="button"
            role="radio"
            aria-checked={form.templateId === card.id}
            className="lumio-ct__template"
            onClick={() => setForm(prev => ({ ...prev, templateId: card.id }))}
          >
            <span className="lumio-ct__template-name">{card.name}</span>
            <span className="lumio-ct__template-desc">{card.description}</span>
            {card.columnCount ? (
              <span className="lumio-ct__template-count">
                {labels.columnsCount.replace('{{count}}', String(card.columnCount))}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Name, description, category and a template to start from. */
export function CreateTableDialog(props: CreateTableDialogProps) {
  const { open, form, setForm, creating, categories, onSubmit, onClose, labels } = props;
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open) {
      window.setTimeout(() => nameRef.current?.focus(), 0);
    }
  }, [open]);
  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      size="md"
      title={labels.title}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          cancelText={labels.cancel}
          confirmText={creating ? labels.creating : labels.submit}
          isConfirmLoading={creating}
          isConfirmDisabled={!form.name.trim()}
        />
      }
    >
      <form
        className="lumio-ct__form"
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="lumio-ct__field lumio-ct__field--wide">
          <span className="lumio-ct__label">{labels.name}</span>
          <input
            className="lumio-ct__input"
            value={form.name}
            placeholder={labels.namePlaceholder}
            ref={nameRef}
            onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <label className="lumio-ct__field lumio-ct__field--wide">
          <span className="lumio-ct__label">{labels.description}</span>
          <input
            className="lumio-ct__input"
            value={form.description}
            placeholder={labels.descriptionPlaceholder}
            onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
          />
        </label>
        <div className="lumio-ct__field lumio-ct__field--wide">
          <span className="lumio-ct__label">{labels.category}</span>
          <Select
            size="small"
            value={form.categoryId}
            onChange={categoryId => setForm(prev => ({ ...prev, categoryId }))}
            options={[
              { value: '', label: labels.noCategory },
              ...categories.map(category => ({ value: category.id, label: category.name })),
            ]}
          />
        </div>
        <TemplatePicker form={form} setForm={setForm} labels={labels} />
      </form>
    </ModalShell>
  );
}
