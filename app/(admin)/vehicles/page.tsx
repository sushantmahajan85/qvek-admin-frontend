import type { Metadata } from "next";

import { VehiclesPage } from "@/components/qvek/pages/fleet";

export const metadata: Metadata = { title: "Vehicles — Qvek Admin" };

export default function Page() {
  return <VehiclesPage />;
}
