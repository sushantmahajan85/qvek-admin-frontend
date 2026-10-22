'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bike,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  ScrollText,
  Settings,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { clearSession } from '@/lib/auth-session';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { QvekMark } from './brand';
import { useDashboard } from '@/features/dashboard/hooks';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'pending';
}

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { href: '/riders', label: 'Riders', icon: Users, badge: 'pending' },
      { href: '/fleet', label: 'Fleet', icon: Truck },
      { href: '/map', label: 'Map', icon: MapIcon },
      { href: '/alerts', label: 'Alerts', icon: Bell },
      { href: '/vehicles', label: 'Vehicles', icon: Bike },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/audit-logs', label: 'Audit log', icon: ScrollText },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/riders': 'Riders',
  '/fleet': 'Fleet',
  '/map': 'Map',
  '/alerts': 'Alerts',
  '/vehicles': 'Vehicles',
  '/audit-logs': 'Audit log',
  '/settings': 'Settings',
};

function sectionOf(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  const base = `/${pathname.split('/')[1]}`;
  return TITLES[base] ?? 'Dashboard';
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useDashboard();
  return (
    <nav className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted2">
            {g.label}
          </p>
          {g.items.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(`${n.href}/`);
            const badge = n.badge === 'pending' ? (data?.pendingRiders ?? 0) : 0;
            return (
              <a
                key={n.href}
                href={n.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-graphite font-medium text-white dark:bg-softwhite dark:text-graphite'
                    : 'text-muted2 hover:bg-hover hover:text-ink',
                )}
              >
                <n.icon className="size-4 shrink-0" />
                <span className="flex-1">{n.label}</span>
                {badge > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                      active ? 'bg-white/20 text-white dark:bg-graphite/10 dark:text-graphite' : 'bg-hover text-ink',
                    )}
                  >
                    {badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function AdminCard() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-edge p-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-graphite text-xs font-bold text-white dark:bg-softwhite dark:text-graphite">
        S
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">Superadmin</span>
        <span className="block truncate text-xs text-muted2">Platform admin</span>
      </span>
      <button
        title="Log out"
        className="rounded-md p-1.5 text-muted2 hover:bg-hover hover:text-ink"
        onClick={() => {
          clearSession();
          qc.clear();
          router.replace('/login');
        }}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-hover">
        <QvekMark size={26} />
        <span className="flex-1">
          <span className="block text-sm font-bold leading-tight">Qvek Fleet</span>
          <span className="block text-[11px] text-muted2">Admin console</span>
        </span>
        {/* <ChevronsUpDown className="size-4 text-muted2" /> */}
      </button>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <AdminCard />
    </>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 flex-col gap-5 overflow-y-auto border-r border-edge bg-card p-4 transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <QvekMark size={24} />
            <span className="text-sm font-bold">Qvek Fleet</span>
          </span>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted2 hover:bg-hover hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
          <SidebarNav onNavigate={onClose} />
        </div>
        <AdminCard />
      </aside>
    </div>
  );
}

export function PanelChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-edge bg-card p-4 md:flex">
        <SidebarBody />
      </aside>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="fixed inset-x-0 top-0 z-30 border-b border-edge bg-cream/95 backdrop-blur md:left-64 dark:bg-ink/95">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-8">
            <span className="flex items-center gap-2 md:hidden">
              <button
                aria-label="Open menu"
                onClick={() => setDrawer(true)}
                className="rounded-md border border-edge p-2 hover:bg-hover"
              >
                <Menu className="size-4" />
              </button>
              <QvekMark size={22} />
            </span>
            <p className="hidden text-sm md:block">
              <span className="text-muted2">Qvek</span>
              <span className="px-1.5 text-muted2">/</span>
              <span className="font-semibold">{sectionOf(pathname)}</span>
            </p>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="flex size-8 items-center justify-center rounded-full bg-graphite text-xs font-bold text-white dark:bg-softwhite dark:text-graphite">
                S
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 p-4 pt-[72px] md:p-8 md:pt-[76px]">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Standard page heading: eyebrow + title + description + actions. Keeps every page aligned. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="pt-1 text-sm text-muted2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
