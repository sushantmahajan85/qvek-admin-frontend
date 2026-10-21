import type { Metadata } from "next";

import { SettingsPage } from "@/components/qvek/pages/ops";

export const metadata: Metadata = { title: "Settings — Qvek Admin" };

export default function Page() {
  return <SettingsPage />;
}
