'use client';

import dynamic from 'next/dynamic';
import type React from 'react';
import { useState } from 'react';
import { useMarkWelcomeTutorialSeen } from './useMarkWelcomeTutorialSeen';
import { useWelcomeTutorialAutoOpen } from './useWelcomeTutorialAutoOpen';
import { closeWelcomeTutorial, useWelcomeTutorialOpen } from './welcome-tutorial-store';

// The dialog and its screenshots load only once the tutorial is opened.
const WelcomeTutorialDialog = dynamic(() => import('./WelcomeTutorialDialog'), { ssr: false });

/**
 * Mounted once in the root layout. Opens the tutorial by itself for a new account
 * and shows it whenever the avatar menu asks for it.
 */
export function WelcomeTutorialHost(): React.JSX.Element | null {
  const open = useWelcomeTutorialOpen();
  const markSeen = useMarkWelcomeTutorialSeen();
  // Each opening is a new session that starts from the intro; after closing, the
  // dialog stays mounted so that its exit transition can play.
  const [session, setSession] = useState({ open: false, count: 0 });
  useWelcomeTutorialAutoOpen();

  if (open !== session.open) {
    setSession({ open, count: open ? session.count + 1 : session.count });
  }
  if (session.count === 0) {
    return null;
  }
  const handleClose = (): void => {
    closeWelcomeTutorial();
    markSeen();
  };
  return <WelcomeTutorialDialog key={session.count} open={open} onClose={handleClose} />;
}
