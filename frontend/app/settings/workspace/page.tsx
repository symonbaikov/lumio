'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspaceSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspaces/overview');
  }, [router]);

  return null;
}
