'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { MfaSetupCard, MockCaptureNote, PlansCard, SupportCard } from '@/features/config/components';

export default function SettingsPage() {
  return (
    <PanelChrome>
      <div className="flex max-w-2xl flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted2">Contact numbers, plans, security and test tooling.</p>
        </div>
        <SupportCard />
        <PlansCard />
        <MfaSetupCard />
        <MockCaptureNote />
      </div>
    </PanelChrome>
  );
}
