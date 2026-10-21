import type { Metadata } from "next";

import { ExpensesPage } from "@/components/qvek/pages/money";

export const metadata: Metadata = { title: "Expenses — Qvek Admin" };

export default function Page() {
  return <ExpensesPage />;
}
