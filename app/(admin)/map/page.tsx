import type { Metadata } from "next";

import { MapPage } from "@/components/qvek/pages/map";

export const metadata: Metadata = { title: "Fleet map — Qvek Admin" };

export default function Page() {
  return <MapPage />;
}
