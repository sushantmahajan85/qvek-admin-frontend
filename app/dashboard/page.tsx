'use client';

import Link from 'next/link';
import { ArrowRight, Bike, Truck, UserPlus } from 'lucide-react';
import { PageHeader, PanelChrome } from '@/components/shared/panel-chrome';
import { ApprovalQueue, StatCard, greeting } from '@/features/dashboard/components';
import { useDashboard } from '@/features/dashboard/hooks';

const QUICK_ACTIONS = [
  { href: '/riders', label: 'Review applications', hint: 'Approve KYC + deposit', icon: UserPlus },
  { href: '/fleet', label: 'Assign vehicle', hint: 'After first recharge', icon: Truck },
  { href: '/vehicles', label: 'Manage scooters', hint: 'Records + replacements', icon: Bike },
];

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const fleet = data?.fleet;
  const totalFleet = fleet ? Object.values(fleet).reduce((a, b) => a + b, 0) : 0;
  const offroad =
    (fleet?.IMMOBILIZED ?? 0) + (fleet?.GRACE ?? 0) + (fleet?.REPAIR ?? 0) + (fleet?.OFFLINE ?? 0);
  return (
    <PanelChrome>
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow={greeting()}
          title="Here's your fleet today"
          description="Approvals, validity and vehicles that need attention."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard title="Fleet vehicles" value={String(totalFleet)} hint={`${fleet?.ACTIVE ?? 0} active`} loading={isLoading} />
          <StatCard title="Needs attention" value={String(offroad)} hint="immobilized / grace / repair / offline" loading={isLoading} />
          <StatCard title="Pending riders" value={String(data?.pendingRiders ?? 0)} hint="awaiting KYC approval" loading={isLoading} />
          <StatCard title="Expiring rentals" value={String(data?.expiringRentals ?? 0)} hint="under 2 days left" loading={isLoading} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-xl border border-edge bg-card p-4 hover:bg-hover"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover">
                <a.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block truncate text-xs text-muted2">{a.hint}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted2 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
        <ApprovalQueue />
      </div>
    </PanelChrome>
  );
}
