import type { Metadata } from "next";

import { AssignmentPage } from "@/components/qvek/pages/fleet";

export const metadata: Metadata = { title: "Vehicle assignment — Qvek Admin" };

export default function Page() {
  return <AssignmentPage />;
}
