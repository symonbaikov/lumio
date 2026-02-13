'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WorkspaceSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspaces/overview');
  }, [router]);

  return null;
}
