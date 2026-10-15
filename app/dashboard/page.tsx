'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { ApprovalQueue, StatCard, greeting } from '@/features/dashboard/components';
import { useDashboard } from '@/features/dashboard/hooks';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const fleet = data?.fleet;
  const totalFleet = fleet ? Object.values(fleet).reduce((a, b) => a + b, 0) : 0;
  const offroad = (fleet?.DISARMED ?? 0) + (fleet?.OFFLINE ?? 0) + (fleet?.WARNING ?? 0);
  return (
    <PanelChrome>
      <h1 className="text-xl font-bold">{greeting()}</h1>
      
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Fleet vehicles" value={String(totalFleet)} hint={`${fleet?.ACTIVE ?? 0} active`} loading={isLoading} />
        <StatCard title="Needs attention" value={String(offroad)} hint="warning / disarmed / offline" loading={isLoading} />
        <StatCard title="Pending riders" value={String(data?.pendingRiders ?? 0)} hint="awaiting KYC approval" loading={isLoading} />
        <StatCard title="Expiring rentals" value={String(data?.expiringRentals ?? 0)} hint="under 2 days left" loading={isLoading} />
      </div>
      <div className="flex flex-col gap-3 pt-3">
        <ApprovalQueue />
      </div>
    </PanelChrome>
  );
}
