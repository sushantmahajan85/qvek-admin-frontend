import type { Metadata } from "next";

import { FinancePage } from "@/components/qvek/pages/money";

export const metadata: Metadata = { title: "Financial history — Qvek Admin" };

export default function Page() {
  return <FinancePage />;
}
