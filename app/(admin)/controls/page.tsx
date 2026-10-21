import type { Metadata } from "next";

import { ControlsPage } from "@/components/qvek/pages/ops";

export const metadata: Metadata = { title: "Vehicle controls — Qvek Admin" };

export default function Page() {
  return <ControlsPage />;
}
