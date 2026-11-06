import type { Metadata } from "next";

import { NotificationsPage } from "@/components/qvek/pages/notifications";

export const metadata: Metadata = { title: "Notifications — Qvek Admin" };

export default function Page() {
  return <NotificationsPage />;
}
