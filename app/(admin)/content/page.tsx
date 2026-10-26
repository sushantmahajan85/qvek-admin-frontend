import type { Metadata } from "next";

import { ContentPage } from "@/components/qvek/pages/content";

export const metadata: Metadata = { title: "App content — Qvek Admin" };

export default function Page() {
  return <ContentPage />;
}
