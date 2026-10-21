import type { Metadata } from "next";

import { ReplacementPage } from "@/components/qvek/pages/fleet";

export const metadata: Metadata = { title: "Vehicle replacement — Qvek Admin" };

export default function Page() {
  return <ReplacementPage />;
}
