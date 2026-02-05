"use client";

import { useMemo } from "react";
import { useIntlayer } from "next-intlayer";
import { Banknote, Folder, Pencil, ThumbsUp, User } from "lucide-react";
import {
  useSidePanelConfig,
  type SidePanelPageConfig,
} from "@/app/components/side-panel";

type ActiveItem = "submit" | "approve" | "pay";

type Props = {
  activeItem: ActiveItem;
};

export default function StatementsSidePanel({ activeItem }: Props) {
  const t = useIntlayer("statementsPage");

  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: "statements",
      header: {
        title: "Statements",
        subtitle: "Overview",
      },
      sections: [
        {
          id: "todo",
          type: "navigation",
          title: (t as any)?.sidePanel?.todoTitle?.value ?? "To-do",
          items: [
            {
              id: "submit",
              label: (t as any)?.sidePanel?.submit?.value ?? "Submit",
              icon: Pencil,
              badge: 0,
              badgeVariant: "default",
              active: activeItem === "submit",
              href: "/statements/submit",
            },
            {
              id: "approve",
              label: (t as any)?.sidePanel?.approve?.value ?? "Approve",
              icon: ThumbsUp,
              badge: 0,
              badgeVariant: "default",
              active: activeItem === "approve",
              href: "/statements/approve",
            },
            {
              id: "pay",
              label: (t as any)?.sidePanel?.pay?.value ?? "Pay",
              icon: Banknote,
              badge: 0,
              badgeVariant: "default",
              active: activeItem === "pay",
              href: "/statements/pay",
            },
          ],
        },
        {
          id: "accounting",
          type: "navigation",
          title: (t as any)?.sidePanel?.accountingTitle?.value ?? "Accounting",
          items: [
            {
              id: "unapproved-cash",
              label: (t as any)?.sidePanel?.unapprovedCash?.value ?? "Unapproved cash",
              icon: Banknote,
            },
          ],
        },
        {
          id: "insights",
          type: "navigation",
          title: (t as any)?.sidePanel?.insightsTitle?.value ?? "Insights",
          items: [
            {
              id: "top-spenders",
              label: (t as any)?.sidePanel?.topSpenders?.value ?? "Top spenders",
              icon: User,
            },
            {
              id: "top-categories",
              label: (t as any)?.sidePanel?.topCategories?.value ?? "Top categories",
              icon: Folder,
            },
          ],
        },
      ],
    }),
    [t, activeItem],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
