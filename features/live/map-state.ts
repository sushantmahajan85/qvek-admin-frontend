/*
 * API responses → the admin UI's read model (`State`).
 *
 * The backend model is leaner than the model the UI was designed around, so anything it does not provide is
 * filled with a neutral default (and the UI shows "—"). Simulated local actions (lib/qvek/sim.ts) are layered
 * on top at the end.
 */
import type { ExpenseRow, FleetRow, ReplacementRow } from '@/features/fleet/api';
import type { KycData } from '@/features/kyc/api';
import type { Rider as ApiRider } from '@/features/riders/api';
import type { SupportConfig } from '@/features/config/api';
import type { TimelineEntry } from '@/features/timeline/api';
import { PLAN_LABEL, type RiderStatus } from '@/lib/constants';
import { DEFAULT_CONFIG, emptyState } from '@/lib/qvek/store';
import type { SimData } from '@/lib/qvek/sim';
import type {
  Alert,
  AssetStatus,
  Expense,
  ExpenseType,
  FinanceEntry,
  FinStatus,
  FinType,
  HistoryItem,
  Kyc,
  KycDoc,
  LogEntry,
  Recovery,
  Replacement,
  Rider,
  State,
  Vehicle,
} from '@/lib/qvek/types';
import { DAY, HOUR, U } from '@/lib/qvek/utils';

export interface LiveInputs {
  fleet: FleetRow[];
  riders: ApiRider[];
  timelines: Record<string, TimelineEntry[] | undefined>;
  /** `null` = no KYC on file, `undefined` = not fetched. */
  kyc: Record<string, KycData | null | undefined>;
  replacements: ReplacementRow[];
  expenses: ExpenseRow[];
  support: SupportConfig | undefined;
  username: string;
  hub: { lat: number; lng: number } | null;
  now: number;
  sim: SimData;
}

const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() || 0 : 0);

const RIDER_STATUS_MAP: Record<RiderStatus, AssetStatus | null> = {
  PENDING: null,
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MARKED_FOR_RECOVERY: 'Marked_for_recovery',
  BLACKLISTED: 'Blacklisted',
  RETURNED: 'Returned',
  REPAIR_REQ: 'Repair_req',
};

/** Backend asset status → UI asset status ('Active' / 'Inactive' are decided from the assignment). */
export const ASSET_TO_API: Record<AssetStatus, RiderStatus> = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
  Marked_for_recovery: 'MARKED_FOR_RECOVERY',
  Blacklisted: 'BLACKLISTED',
  Returned: 'RETURNED',
  Repair_req: 'REPAIR_REQ',
};

const PLAN_WEEKS: Record<string, { id: string; weeks: number }> = {
  WEEKLY: { id: 'weekly', weeks: 1 },
  '2-WEEKLY': { id: 'biweekly', weeks: 2 },
  MONTHLY: { id: 'monthly', weeks: 4 },
};

const planName = (code?: string | null) => (code ? ((PLAN_LABEL as Record<string, string>)[code] ?? code) : null);

function timelineType(kind: string): FinType {
  switch (kind.toUpperCase()) {
    case 'DEPOSIT':
    case 'DEPOSIT_PENDING':
      return 'deposit';
    case 'RENT':
      return 'recharge';
    case 'ADJUSTMENT':
      return 'first_cycle';
    case 'REFUND':
    case 'SETTLEMENT':
      return 'refund';
    case 'REPAIR':
      return 'repair';
    case 'SERVICING':
      return 'servicing';
    default:
      return 'service';
  }
}

const TIMELINE_TITLE: Record<FinType, string> = {
  deposit: 'Security deposit',
  recharge: 'Plan recharge',
  first_cycle: 'Adjusted first cycle',
  service: 'Service charge',
  repair: 'Repair expense',
  servicing: 'Servicing expense',
  refund: 'Refund',
};

function finStatus(s: string): FinStatus {
  const v = s.toLowerCase();
  if (v.startsWith('succ') || v === 'verified' || v === 'captured') return 'success';
  if (v.startsWith('fail') || v === 'rejected') return 'failed';
  return 'pending';
}

/** Equirectangular offset (km) of a GPS fix from the hub — plenty accurate at city scale. */
function toPos(lat: number, lng: number, hub: { lat: number; lng: number }) {
  return {
    x: (lng - hub.lng) * 111.32 * Math.cos((hub.lat * Math.PI) / 180),
    y: (lat - hub.lat) * 110.57,
  };
}

/** Hub position: env override, else the median of every reported GPS fix (so the map is centred on the fleet). */
export function resolveHub(fleet: FleetRow[]): { lat: number; lng: number } | null {
  const envLat = Number(process.env.NEXT_PUBLIC_HUB_LAT);
  const envLng = Number(process.env.NEXT_PUBLIC_HUB_LNG);
  if (Number.isFinite(envLat) && Number.isFinite(envLng) && process.env.NEXT_PUBLIC_HUB_LAT && process.env.NEXT_PUBLIC_HUB_LNG) {
    return { lat: envLat, lng: envLng };
  }
  const pts = fleet.filter((r) => r.lat != null && r.lng != null) as (FleetRow & { lat: number; lng: number })[];
  if (!pts.length) return null;
  const med = (xs: number[]) => {
    const s = xs.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return { lat: med(pts.map((p) => p.lat)), lng: med(pts.map((p) => p.lng)) };
}

function mapKyc(status: RiderStatus, k: KycData | null | undefined): { kyc: Kyc; loaded: boolean; info: Rider['kycInfo'] } {
  const missing: KycDoc = { status: 'missing' };
  if (k === undefined) {
    // Not fetched (only pending riders are fetched eagerly). Approved riders had KYC verified at approval.
    const onFile: KycDoc = { status: 'verified', file: 'On file', sample: false };
    const d = status === 'PENDING' ? missing : onFile;
    return { kyc: { aadhaar: d, pan: d, dl: d }, loaded: false, info: undefined };
  }
  if (k === null) return { kyc: { aadhaar: missing, pan: missing, dl: missing }, loaded: true, info: null };
  const doc = (masked: string | null): KycDoc =>
    masked ? { status: k.verified ? 'verified' : 'submitted', file: masked, sample: false, at: ms(k.updatedAt) } : missing;
  return {
    kyc: { aadhaar: doc(k.aadhaar), pan: doc(k.pan), dl: doc(k.dlNo) },
    loaded: true,
    info: { fullName: k.fullName, aadhaar: k.aadhaar, pan: k.pan, dlNo: k.dlNo, verified: k.verified, docs: (k.docs ?? []).map((d) => ({ key: d.key, url: d.url })) },
  };
}

export function buildState(inp: LiveInputs): State {
  const s = emptyState();
  const { now, sim } = inp;
  const hub = inp.hub ?? { lat: 0, lng: 0 };

  /* ---- config ------------------------------------------------------ */
  s.config = {
    ...DEFAULT_CONFIG,
    plans: Object.entries(inp.support?.plans ?? {}).map(([code, paise]) => ({
      id: PLAN_WEEKS[code]?.id ?? code.toLowerCase(),
      name: planName(code) ?? code,
      weeks: PLAN_WEEKS[code]?.weeks ?? 1,
      price: Math.round(paise / 100),
    })),
    support: { call: inp.support?.callNumber ?? '', whatsapp: inp.support?.whatsappNumber ?? '', hours: '' },
    admin: { ...DEFAULT_CONFIG.admin, id: inp.username, name: 'Fleet Admin' },
  };
  s.clock = { base: now, setAt: now };

  /* ---- riders ------------------------------------------------------ */
  const fleetByRider = new Map<string, FleetRow>();
  inp.fleet.forEach((row) => {
    if (row.rider) fleetByRider.set(row.rider.id, row);
  });

  const finance: FinanceEntry[] = [];
  s.riders = inp.riders.map((r): Rider => {
    const tl = (inp.timelines[r.id] ?? []).slice().sort((a, b) => ms(b.ts) - ms(a.ts));
    const row = fleetByRider.get(r.id);

    // Plan validity: the fleet row is authoritative; otherwise the newest timeline entry that set one.
    const tlValidity = tl.find((e) => e.afterValidity);
    const endMs = ms(row?.rider?.planValidity) || ms(tlValidity?.afterValidity);
    const planCode = tl.find((e) => e.plan)?.plan ?? null;
    const plan = endMs
      ? { planId: planCode ?? 'plan', name: planName(planCode) ?? 'Plan', start: ms(tlValidity?.period?.from) || endMs - 7 * DAY, end: endMs }
      : null;
    const grace = row && row.status === 'GRACE' ? { start: endMs || now - HOUR, end: (endMs || now - HOUR) + DAY } : null;

    const depositEntry = tl.find((e) => e.kind === 'DEPOSIT');
    const refunded = tl.some((e) => e.kind === 'REFUND' || e.kind === 'SETTLEMENT');
    const { kyc, loaded, info } = mapKyc(r.status, inp.kyc[r.id]);
    const applied = ms(r.createdAt);

    const patch = sim.riders[r.id];
    return {
      id: r.id,
      customerId: r.customerId ?? null,
      name: patch?.name ?? r.name,
      phone: patch?.phone ?? r.phone,
      age: patch?.age ?? r.age ?? 0,
      language: 'en',
      source: 'app',
      platform: patch?.platform ?? r.platform ?? '—',
      createdAt: applied,
      application: {
        status: r.status === 'PENDING' ? 'pending' : r.status === 'INACTIVE' && !r.paidToken ? 'rejected' : 'approved',
        submittedAt: applied,
        reviewedAt: applied,
      },
      kyc,
      kycLoaded: loaded,
      kycInfo: info,
      deposit: r.paidToken
        ? { status: refunded ? 'refunded' : 'received', amount: DEFAULT_CONFIG.deposit, mode: 'offline', at: ms(depositEntry?.ts) || applied }
        : { status: 'pending', amount: 0, mode: null, at: null },
      status: RIDER_STATUS_MAP[r.status],
      vehicleId: row?.id ?? null,
      plan,
      grace,
      firstCycleDone: tl.some((e) => e.kind === 'RENT' && finStatus(e.status) === 'success'),
      flags: {},
      statusNote: '',
      paidToken: r.paidToken,
      edits: sim.riderEdits[r.id],
    };
  });

  /* ---- finance (every rider's timeline) ---------------------------- */
  inp.riders.forEach((r) => {
    (inp.timelines[r.id] ?? []).forEach((e, i) => {
      const type = timelineType(e.kind);
      const at = ms(e.ts);
      finance.push({
        id: `${r.id}:${at}:${i}`,
        ref: `TL-${r.id.slice(-4).toUpperCase()}-${at.toString(36).toUpperCase().slice(-5)}`,
        riderId: r.id,
        vehicleId: null,
        at,
        type,
        title: e.kind.toUpperCase() === 'SETTLEMENT' ? 'Deposit settlement' : TIMELINE_TITLE[type],
        amount: Math.round(e.amountPaise / 100),
        status: finStatus(e.status),
        method: e.kind.toUpperCase() === 'RENT' ? 'UPI' : '—',
        source: 'api',
        planName: planName(e.plan) ?? '',
        periodStart: e.period ? ms(e.period.from) : null,
        periodEnd: e.period ? ms(e.period.to) : null,
        note: e.note ?? '',
      });
    });
  });
  s.finance = finance;

  /* ---- vehicles ---------------------------------------------------- */
  const replacementsByVehicle = new Map<string, { odo: number; at: number }>();
  inp.replacements.forEach((rp) => {
    const at = ms(rp.createdAt);
    const note = (vid: string, odo: number | null | undefined) => {
      if (odo == null) return;
      const cur = replacementsByVehicle.get(vid);
      if (!cur || at > cur.at) replacementsByVehicle.set(vid, { odo, at });
    };
    note(rp.oldVehicleId, rp.odometerOldKm);
    note(rp.newVehicleId, rp.odometerNewKm);
  });

  s.vehicles = inp.fleet.map((row): Vehicle => {
    const riderStatus = row.rider?.status;
    const recovering = !!row.recovery;
    const hasGps = row.lat != null && row.lng != null;
    const lastGps = ms(row.lastPingAt);
    const planEnd = ms(row.rider?.planValidity);
    const patch = sim.vehicles[row.id];

    let status: AssetStatus = row.status === 'REPAIR' ? 'Repair_req' : recovering ? 'Marked_for_recovery' : row.rider ? 'Active' : 'Inactive';
    let immobilized = row.status === 'IMMOBILIZED';
    let immobilizedReason: Vehicle['immobilizedReason'] = immobilized ? (planEnd && planEnd < now ? 'plan_expiry' : 'manual') : null;
    if (patch) {
      if (patch.status) status = patch.status;
      if (patch.immobilized !== undefined) {
        immobilized = patch.immobilized;
        immobilizedReason = patch.immobilized ? (patch.immobilizedReason ?? 'manual') : null;
      }
    }

    const history: HistoryItem[] = [];
    if (row.createdAt) history.push({ id: `h-created-${row.id}`, at: ms(row.createdAt), type: 'created', title: 'Vehicle record created', detail: `Registered as ${row.vehicleNo}` });
    (row.componentHistory ?? []).forEach((c, i) => {
      const label = c.component === 'motorNo' ? 'Motor' : c.component === 'controllerNo' ? 'Controller' : 'Chassis';
      history.push({
        id: `h-comp-${row.id}-${i}`,
        at: ms(c.at),
        type: 'component',
        field: c.component,
        title: `${label} ${c.oldNo ? 'replaced' : 'recorded'}`,
        detail: c.oldNo ? `${c.oldNo} → ${c.newNo}` : `${c.newNo ?? ''}`,
        old: c.oldNo ?? undefined,
        new: c.newNo ?? undefined,
      });
    });
    if (row.assignment && row.rider) {
      history.push({ id: `h-asg-${row.id}`, at: ms(row.assignment.startedAt), type: 'assignment', title: `Assigned to ${row.rider.name}`, detail: row.rider.customerId ? `Customer ${row.rider.customerId}` : '' });
    }
    inp.replacements.forEach((rp) => {
      const odo = (n?: number | null) => (n == null ? '' : ` · odometer ${U.num(n)} km`);
      if (rp.oldVehicleId === row.id) history.push({ id: `h-rp-${rp.id}`, at: ms(rp.createdAt), type: 'replacement', title: `Replaced — ${rp.reason}`, detail: `Swapped out${odo(rp.odometerOldKm)}` });
      if (rp.newVehicleId === row.id) history.push({ id: `h-rpn-${rp.id}`, at: ms(rp.createdAt), type: 'replacement', title: 'Assigned (replacement)', detail: `Replaces another vehicle${odo(rp.odometerNewKm)}` });
    });
    (sim.history[row.id] ?? []).forEach((h) => history.push(h));
    history.sort((a, b) => a.at - b.at);

    return {
      id: row.id,
      regNo: row.vehicleNo,
      chassisNo: row.chassisNo || '—',
      motorNo: row.motorNo || '—',
      controllerNo: row.controllerNo || '—',
      model: row.type === 'LIGHT_2W' ? 'Qvek light scooter (single type)' : row.type,
      riderId: row.rider?.id ?? null,
      status,
      immobilized,
      immobilizedReason,
      online: row.status !== 'OFFLINE',
      lastGps,
      lastMoved: row.idle ? Math.min(lastGps, now - 73 * HOUR) : lastGps,
      pos: hasGps ? toPos(row.lat as number, row.lng as number, hub) : { x: 0, y: 0 },
      lat: row.lat,
      lng: row.lng,
      hasGps,
      odometer: replacementsByVehicle.get(row.id)?.odo ?? null,
      idle: !!row.idle,
      mapsUrl: row.recovery?.mapsUrl ?? (hasGps ? `https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}` : null),
      iopId: row.iopId,
      history,
      flags: {},
    };
  });

  /* ---- expenses / replacements ------------------------------------ */
  const expenseType = (k: ExpenseRow['kind']): ExpenseType => (k === 'DEPOSIT_PENDING' ? 'pending_deposit' : k === 'REPAIR' ? 'repair' : 'servicing');
  s.expenses = inp.expenses.map((e): Expense => ({
    id: e.id,
    type: expenseType(e.kind),
    amount: Math.round(e.amountPaise / 100),
    date: U.isoDate(ms(e.createdAt)),
    riderId: e.riderId ?? null,
    vehicleId: e.vehicleId ?? null,
    notes: e.note ?? '',
    at: ms(e.createdAt),
    // Expenses with a rider are mirrored into that rider's financial history by the backend timeline.
    financeId: e.riderId ? e.id : undefined,
  }));
  s.replacements = inp.replacements.map((rp): Replacement => ({
    id: rp.id,
    riderId: rp.riderId,
    oldVehicleId: rp.oldVehicleId,
    newVehicleId: rp.newVehicleId,
    reason: rp.reason,
    date: U.isoDate(ms(rp.createdAt)),
    oldOdo: rp.odometerOldKm ?? 0,
    newOdo: rp.odometerNewKm ?? 0,
    at: ms(rp.createdAt),
  }));

  /* ---- recoveries --------------------------------------------------- */
  s.recoveries = [
    ...inp.fleet
      .filter((row) => row.recovery)
      .map((row): Recovery => {
        const steps = sim.recoverySteps[row.id] ?? {};
        return {
          id: `rc-${row.id}`,
          vehicleId: row.id,
          riderId: row.rider?.id ?? null,
          markedAt: ms(row.recovery?.at) || now,
          mode: row.rider?.status === 'BLACKLISTED' ? 'auto' : 'manual',
          reason: row.rider?.status === 'BLACKLISTED' ? 'Rider blacklisted while holding a vehicle' : 'Rider marked for recovery',
          steps: { shared: steps.shared ?? null, agentCalled: steps.agentCalled ?? null, unlocked: steps.unlocked ?? null, returned: steps.returned ?? null },
          closedAt: null,
        };
      }),
    ...sim.closedRecoveries,
  ];

  /* ---- activity log (replacements + simulated actions) -------------- */
  const logs: LogEntry[] = inp.replacements.map((rp) => {
    const oldV = inp.fleet.find((f) => f.id === rp.oldVehicleId);
    const newV = inp.fleet.find((f) => f.id === rp.newVehicleId);
    return {
      id: `l-rp-${rp.id}`,
      at: ms(rp.createdAt),
      vehicleId: rp.newVehicleId,
      riderId: rp.riderId,
      action: 'replace',
      mode: 'manual',
      reason: `${oldV?.vehicleNo ?? '?'} → ${newV?.vehicleNo ?? '?'} (${rp.reason})`,
      by: 'Admin',
      result: 'success',
    };
  });
  s.logs = [...logs, ...sim.logs];

  /* ---- alerts (derived from current state; read marks are local) ---- */
  const alerts: Alert[] = [];
  const push = (id: string, level: Alert['level'], title: string, body: string, ref: Alert['ref'], at: number) => {
    alerts.push({ id, level, title, body, ref, at, read: sim.alertsRead.includes(id) });
  };
  s.vehicles.forEach((v) => {
    const r = G_rider(s, v.riderId);
    const who = r ? ` — ${r.name}` : '';
    const ref = { type: 'vehicle' as const, id: v.id };
    const at = v.lastGps || now;
    if (v.status === 'Marked_for_recovery') push(`al:rec:${v.id}`, 'critical', 'Marked for recovery', `${v.regNo}${who}`, ref, at);
    else if (v.immobilized) push(`al:imm:${v.id}`, 'critical', 'Vehicle immobilized', `${v.regNo}${who} is immobilized`, ref, at);
    if (r && r.grace && !r.grace.lapsed) push(`al:grace:${v.id}`, 'warning', 'Grace period', `${v.regNo}${who} — plan expired`, ref, r.grace.start);
    if (v.idle) push(`al:idle:${v.id}`, 'warning', 'Idle 72h+', `${v.regNo}${who} has not moved in 72 hours`, ref, at);
    if (!v.online) push(`al:off:${v.id}`, 'warning', 'Vehicle offline', `${v.regNo}${who} stopped reporting`, ref, at);
  });
  s.riders
    .filter((r) => r.application.status === 'pending')
    .forEach((r) => push(`al:app:${r.id}`, 'info', 'New application', `${r.name} submitted an onboarding application`, { type: 'rider', id: r.id }, r.application.submittedAt));
  s.alerts = alerts;

  return s;
}

function G_rider(s: State, id: string | null) {
  return id ? s.riders.find((r) => r.id === id) : undefined;
}
