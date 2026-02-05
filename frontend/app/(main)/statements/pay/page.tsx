"use client";

import StatementsListView from "../components/StatementsListView";
import StatementsSidePanel from "../components/StatementsSidePanel";

export default function StatementsPayPage() {
  return (
    <>
      <StatementsSidePanel activeItem="pay" />
      <StatementsListView stage="pay" />
    </>
  );
}
