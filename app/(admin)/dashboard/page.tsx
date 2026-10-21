import type { Metadata } from "next";

import { DashboardPage } from "@/components/qvek/pages/dashboard";

export const metadata: Metadata = { title: "Fleet dashboard — Qvek Admin" };

export default function Page() {
  return <DashboardPage />;
}
