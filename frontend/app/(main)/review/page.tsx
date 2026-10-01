'use client';

import Box from '@mui/material/Box';
import { Suspense } from 'react';
import { ReviewInboxView } from './components/ReviewInboxView';
import { useReviewInbox } from './hooks/useReviewInbox';

function ReviewInboxPageContent() {
  const state = useReviewInbox();
  return <ReviewInboxView state={state} />;
}

export default function ReviewInboxPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: 'calc(100vh - var(--global-nav-height,0px))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense fallback={null}>
        <ReviewInboxPageContent />
      </Suspense>
    </Box>
  );
}
