import type { Metadata } from "next";

import { RecoveryPage } from "@/components/qvek/pages/ops";

export const metadata: Metadata = { title: "Recovery — Qvek Admin" };

export default function Page() {
  return <RecoveryPage />;
}
