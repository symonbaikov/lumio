'use client';

import { useState } from 'react';
import TrashListView from '../components/TrashListView';
import TrashSidePanel from '../components/TrashSidePanel';

export default function StatementsTrashPage() {
  const [trashCount, setTrashCount] = useState<number | null>(null);

  return (
    <>
      <TrashSidePanel trashCount={trashCount} />
      <TrashListView onCountChange={setTrashCount} />
    </>
  );
}
