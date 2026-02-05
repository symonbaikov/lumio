"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StatementsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/statements/submit");
  }, [router]);

  return null;
}
