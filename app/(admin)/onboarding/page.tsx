import type { Metadata } from "next";

import { OnboardingPage } from "@/components/qvek/pages/people";

export const metadata: Metadata = { title: "Rider onboarding — Qvek Admin" };

export default function Page() {
  return <OnboardingPage />;
}
