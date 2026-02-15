'use client';

import { Alert } from '@/app/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type NotificationPreferences = {
  statementUploaded: boolean;
  importCommitted: boolean;
  categoryChanges: boolean;
  memberActivity: boolean;
  dataDeleted: boolean;
  workspaceUpdated: boolean;
  parsingErrors: boolean;
  importFailures: boolean;
  uncategorizedItems: boolean;
};

const defaultPreferences: NotificationPreferences = {
  statementUploaded: true,
  importCommitted: true,
  categoryChanges: true,
  memberActivity: true,
  dataDeleted: true,
  workspaceUpdated: true,
  parsingErrors: true,
  importFailures: true,
  uncategorizedItems: true,
};

const workspaceSettings: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}> = [
  {
    key: 'statementUploaded',
    label: 'Загрузка выписок',
    description: 'Когда участники загружают новые выписки',
  },
  {
    key: 'importCommitted',
    label: 'Импорт транзакций',
    description: 'Когда участники подтверждают импорт транзакций',
  },
  {
    key: 'categoryChanges',
    label: 'Изменение категорий',
    description: 'Создание, изменение и удаление категорий',
  },
  {
    key: 'memberActivity',
    label: 'Активность участников',
    description: 'Приглашения и вступление новых участников',
  },
  {
    key: 'dataDeleted',
    label: 'Удаление данных',
    description: 'Удаление транзакций, выписок и других данных',
  },
  {
    key: 'workspaceUpdated',
    label: 'Настройки workspace',
    description: 'Изменение названия, валюты и других параметров',
  },
];

const systemSettings: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}> = [
  {
    key: 'parsingErrors',
    label: 'Ошибки парсинга',
    description: 'Проблемы при обработке выписок',
  },
  {
    key: 'importFailures',
    label: 'Ошибки импорта',
    description: 'Импорт завершился с ошибкой',
  },
  {
    key: 'uncategorizedItems',
    label: 'Операции без категории',
    description: 'Транзакции и чеки, требующие категоризации',
  },
];

export default function NotificationSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadPreferences = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/notifications/preferences');
        if (!active) {
          return;
        }
        setPreferences({
          ...defaultPreferences,
          ...(response.data || {}),
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError('Не удалось загрузить настройки уведомлений');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [user]);

  const togglePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSavingKey(key);
    setError(null);
    setMessage(null);

    const previous = preferences;
    setPreferences(current => ({ ...current, [key]: value }));

    try {
      await apiClient.patch('/notifications/preferences', { [key]: value });
      setMessage('Настройки сохранены');
    } catch (saveError) {
      setPreferences(previous);
      setError('Не удалось сохранить настройки уведомлений');
    } finally {
      setSavingKey(null);
    }
  };

  if (authLoading || loading) {
    return <div className="container-shared py-6 text-sm text-muted-foreground">Загрузка...</div>;
  }

  if (!user) {
    return (
      <div className="container-shared py-6">
        <Alert variant="warning">Войдите в систему, чтобы управлять уведомлениями</Alert>
      </div>
    );
  }

  return (
    <div className="container-shared py-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Настройки уведомлений</h1>
        <p className="text-sm text-muted-foreground">
          Выберите, какие уведомления хотите получать в колокольчике.
        </p>
        <Link href="/settings/profile" className="text-xs text-primary hover:opacity-80">
          Вернуться в настройки профиля
        </Link>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Активность workspace</CardTitle>
          <CardDescription>Уведомления о действиях других участников</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaceSettings.map(setting => {
            const inputId = `workspace-pref-${setting.key}`;
            return (
              <div
                key={setting.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border p-3"
              >
              <div className="space-y-1">
                <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                  {setting.label}
                </label>
                <p className="text-xs text-muted-foreground">{setting.description}</p>
              </div>
              <Checkbox
                id={inputId}
                checked={preferences[setting.key]}
                onCheckedChange={checked => void togglePreference(setting.key, checked)}
                disabled={savingKey === setting.key}
                aria-label={setting.label}
              />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Системные уведомления</CardTitle>
          <CardDescription>Критичные события и ошибки обработки данных</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemSettings.map(setting => {
            const inputId = `system-pref-${setting.key}`;
            return (
              <div
                key={setting.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border p-3"
              >
              <div className="space-y-1">
                <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                  {setting.label}
                </label>
                <p className="text-xs text-muted-foreground">{setting.description}</p>
              </div>
              <Checkbox
                id={inputId}
                checked={preferences[setting.key]}
                onCheckedChange={checked => void togglePreference(setting.key, checked)}
                disabled={savingKey === setting.key}
                aria-label={setting.label}
              />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
