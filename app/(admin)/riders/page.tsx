import type { Metadata } from "next";

import { RidersPage } from "@/components/qvek/pages/people";

export const metadata: Metadata = { title: "Riders — Qvek Admin" };

export default function Page() {
  return <RidersPage />;
}
