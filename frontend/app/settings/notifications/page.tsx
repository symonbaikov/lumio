'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotificationSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/profile#notifications');
  }, [router]);

  return <div className="container-shared py-6 text-sm text-muted-foreground">Загрузка...</div>;
}
