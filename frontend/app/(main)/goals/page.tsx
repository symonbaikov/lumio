'use client';

import { Plus } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { ContributionDialog } from './components/ContributionDialog';
import { GoalCard } from './components/GoalCard';
import { GoalFormDialog } from './components/GoalFormDialog';
import { EMPTY_GOAL_FORM, type Goal, type GoalFormData, useGoals } from './hooks/useGoals';

export default function GoalsPage() {
  const t = useIntlayer('goalsPage');
  const { locale } = useLocale();
  const { goals, loading, error, saving, createGoal, updateGoal, deleteGoal, addContribution } =
    useGoals();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormData>(EMPTY_GOAL_FORM);

  const [contributing, setContributing] = useState<Goal | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_GOAL_FORM);
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate ?? '',
    });
    setFormOpen(true);
  };

  const saveGoal = async () => {
    const ok = editing ? await updateGoal(editing.id, form) : await createGoal(form);
    if (ok) {
      setFormOpen(false);
    }
  };

  const openContribution = (goal: Goal) => {
    setContributing(goal);
    setAmount('');
    setNote('');
  };

  const saveContribution = async () => {
    if (!contributing) {
      return;
    }
    const ok = await addContribution(contributing.id, Number(amount), note);
    if (ok) {
      setContributing(null);
    }
  };

  return (
    <Box component="main" sx={{ p: 3, maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.subtitle}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate}>
          {t.newGoal}
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {error && !loading && (
        <Typography color="error" sx={{ py: 6, textAlign: 'center' }}>
          {t.error}
        </Typography>
      )}

      {!loading && !error && goals.length === 0 && (
        <Typography sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
          {t.empty}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            locale={locale}
            labels={{
              addContribution: t.addContribution.value,
              edit: t.edit.value,
              remove: t.remove.value,
              reached: t.reached.value,
              remaining: t.remaining.value,
            }}
            onContribute={openContribution}
            onEdit={openEdit}
            onDelete={item => void deleteGoal(item.id)}
          />
        ))}
      </Box>

      <GoalFormDialog
        open={formOpen}
        title={editing ? t.edit.value : t.newGoal.value}
        form={form}
        saving={saving}
        labels={{
          name: t.nameLabel.value,
          target: t.targetLabel.value,
          date: t.dateLabel.value,
          save: t.save.value,
          cancel: t.cancel.value,
        }}
        onChange={setForm}
        onClose={() => setFormOpen(false)}
        onSave={() => void saveGoal()}
      />

      <ContributionDialog
        open={contributing !== null}
        title={contributing?.name ?? ''}
        amount={amount}
        note={note}
        saving={saving}
        labels={{
          amount: t.amountLabel.value,
          note: t.noteLabel.value,
          save: t.save.value,
          cancel: t.cancel.value,
        }}
        onAmountChange={setAmount}
        onNoteChange={setNote}
        onClose={() => setContributing(null)}
        onSave={() => void saveContribution()}
      />
    </Box>
  );
}
