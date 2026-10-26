"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { simCloseRecovery, simRecoveryStep } from "@/features/live/sim-actions";
import { ApiError } from "@/lib/api-client";
import { errorText } from "@/lib/error-map";
import { toast } from "@/lib/toast";
import { signOut } from "@/lib/qvek/auth";
import { patchPageState } from "@/lib/qvek/page-state";
import { G, store } from "@/lib/qvek/store";
import { useStore } from "@/lib/qvek/use-store";
import { transitionRider } from "@/features/riders/api";
import { reactivateVehicle } from "@/features/fleet/api";
import { AdminContext, type AdminApi } from "./admin-context";
import { AssetBadge, VFlags } from "./bits";
import { Drawer } from "./drawer";
import { RiderDrawerBody, VehicleDrawerBody } from "./drawers";
import {
  AddRiderFlow,
  AddVehicleFlow,
  ApproveFlow,
  ComponentsFlow,
  ControlFlow,
  CopyManualFlow,
  DocPreviewFlow,
  EditKycFlow,
  EditRiderFlow,
  FinDetailFlow,
  ManualRecoveryFlow,
  RejectFlow,
  StatusFlow,
} from "./flows";
import { reduceMotion, useUI } from "./ui-context";

interface DrawerState {
  kind: "vehicle" | "rider";
  id: string;
  seq: number;
  fin: string;
  closing: boolean;
}

/** Owns the vehicle / rider drawer and exposes every cross-page admin action. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ui = useUI();
  const qc = useQueryClient();
  useStore();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const seq = useRef(0);

  // Idle auto-logout (30 min): shared admin terminal safety. Silent — no
  // confirm, since the operator is by definition away.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const kick = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try {
          if (!document.cookie.includes('qvek_admin=1')) return;
        } catch {
          return;
        }
        signOut();
        qc.clear();
        router.replace('/login');
      }, 30 * 60 * 1000);
    };
    kick();
    const evts = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    evts.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    return () => {
      if (t) clearTimeout(t);
      evts.forEach((e) => window.removeEventListener(e, kick));
    };
  }, [qc, router]);

  const closeDrawer = useCallback(() => {
    setDrawer((d) => (d && !d.closing ? { ...d, closing: true } : d));
    setTimeout(() => setDrawer((d) => (d && d.closing ? null : d)), reduceMotion() ? 0 : 260);
  }, []);

  const openDrawer = useCallback((kind: "vehicle" | "rider", id: string) => {
    seq.current += 1;
    setDrawer({ kind, id, seq: seq.current, fin: "all", closing: false });
  }, []);

  const api = useMemo<AdminApi>(() => {
    const openRider = (id: string) => openDrawer("rider", id);
    return {
      openRider,
      openVehicle: (id) => openDrawer("vehicle", id),
      closeDrawer,

      control: (vehicleId, op) => void ui.open(<ControlFlow id={vehicleId} op={op} />),
      async copyRecoveryLink(vehicleId, recId) {
        const v = G.vehicle(vehicleId)!;
        const r = G.vehicleRider(v);
        const text = "Qvek recovery — " + v.regNo + (r ? " (" + r.name + (r.customerId ? ", " + r.customerId : "") + ")" : "") + "\nLast known location: " + (v.mapsUrl ?? "no GPS fix yet");
        const ok = await ui.copy(text);
        if (ok) {
          const rc = store.state.recoveries.find((x) => x.id === recId);
          if (rc && !rc.steps.shared) simRecoveryStep(rc, v, "shared");
          ui.toast("Paste it in the Recovery Agents WhatsApp group.", { title: "Location link copied" });
        } else {
          void ui.open(<CopyManualFlow text={text} />);
        }
      },
      async recoveryStep(recId, step) {
        const rc = store.state.recoveries.find((x) => x.id === recId);
        if (!rc) return;
        const v = G.vehicle(rc.vehicleId)!;
        const cfg = {
          agentCalled: ["Agent reached the scooter?", "Confirm the recovery agent is with " + v.regNo + " and has called you.", "Confirm", "phone"],
          unlocked: ["Unlock " + v.regNo + "?", "The scooter will be reactivated via the IOP relay so the agent can ride it back to the facility.", "Unlock scooter", "unlock"],
          returned: ["Mark as returned to facility?", v.regNo + " will be unlinked from the rider (rider status → Returned) and the recovery closed.", "Close recovery", "warehouse"],
        }[step];
        const ok = await ui.confirm({ title: cfg[0], body: <p>{cfg[1]}</p>, confirmLabel: cfg[2], kind: "primary", icon: cfg[3] });
        if (!ok) return;
        if (step === "returned") {
          // Real: the rider moves to RETURNED on the server, which ends the vehicle assignment.
          if (!rc.riderId) return;
          try {
            await transitionRider(rc.riderId, "RETURNED", "Recovered to facility");
          } catch (e) {
            toast.error(errorText(e instanceof ApiError ? e.code : undefined));
            return;
          }
          simCloseRecovery(rc, v);
          await Promise.all([qc.invalidateQueries({ queryKey: ["fleet"] }), qc.invalidateQueries({ queryKey: ["riders"] })]);
          ui.toast("Recovery closed — " + v.regNo + " returned", { title: "Recovery updated" });
          return;
        }
        if (step === "unlocked") {
          // Real: reactivate via the IOP relay; relay failures keep the state and the step open.
          try {
            await reactivateVehicle(v.id, "Recovery — agent on site");
          } catch (e) {
            toast.error(errorText(e instanceof ApiError ? e.code : undefined));
            return;
          }
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["fleet"] }),
            qc.invalidateQueries({ queryKey: ["admin-map"] }),
            qc.invalidateQueries({ queryKey: ["audit-logs"] }),
          ]);
        }
        simRecoveryStep(rc, v, step);
        ui.toast(step === "agentCalled" ? "Agent call recorded" : v.regNo + " unlocked via tracker relay", { title: "Recovery updated" });
      },
      manualRecovery: () => void ui.open(<ManualRecoveryFlow />),

      approve: (id) => void ui.open(<ApproveFlow id={id} />),
      reject: (id) => void ui.open(<RejectFlow id={id} />),
      viewDoc: (riderId, key) => void ui.open(<DocPreviewFlow riderId={riderId} docKey={key} />),
      editRider: (id) => void ui.open(<EditRiderFlow id={id} />),
      editKyc: (id) => void ui.open(<EditKycFlow id={id} />),
      riderStatus: (id) => void ui.open(<StatusFlow kind="rider" id={id} />),
      vehicleStatus: (id) => void ui.open(<StatusFlow kind="vehicle" id={id} />),
      editComponents: (id) => void ui.open(<ComponentsFlow id={id} />),
      addRider: () => void ui.open(<AddRiderFlow onAdded={openRider} />),
      addVehicle: () => void ui.open(<AddVehicleFlow />),
      finDetail: (id) => void ui.open(<FinDetailFlow id={id} onOpenRider={openRider} />),

      goReplace(riderId) {
        patchPageState("replacement", {
          form: { riderId, newVehicleId: "", reason: "", reasonOther: "", date: "", oldOdo: "", newOdo: "" },
          err: {},
        });
        closeDrawer();
        router.push("/replacement");
      },
      goAssign(riderId) {
        patchPageState("assignment", { rider: riderId, q: "" });
        closeDrawer();
        router.push("/assignment");
      },
      goAssignVehicle(vehicleId) {
        patchPageState("assignment", { vehicle: vehicleId });
        closeDrawer();
        router.push("/assignment");
      },
      showOnMap(vehicleId) {
        const v = G.vehicle(vehicleId)!;
        patchPageState("map", { sel: v.id, zoom: 2.2, cx: v.pos.x * 10, cy: -v.pos.y * 10, filter: "all" });
        closeDrawer();
        router.push("/map");
      },

      async logout() {
        const ok = await ui.confirm({ title: "Log out?", body: <p>You will need your password and a 2FA code to sign in again.</p>, confirmLabel: "Log out", kind: "danger", icon: "logout" });
        if (!ok) return;
        signOut();
        qc.clear();
        closeDrawer();
        router.replace("/login");
      },
    };
  }, [closeDrawer, openDrawer, qc, router, ui]);

  return (
    <AdminContext.Provider value={api}>
      {children}
      {drawer ? <DrawerHost key={drawer.seq} drawer={drawer} onFin={(f) => setDrawer((d) => (d ? { ...d, fin: f } : d))} onClose={closeDrawer} /> : null}
    </AdminContext.Provider>
  );
}

function DrawerHost({ drawer, onFin, onClose }: { drawer: DrawerState; onFin: (f: string) => void; onClose: () => void }) {
  useStore();
  const isVehicle = drawer.kind === "vehicle";
  const v = isVehicle ? G.vehicle(drawer.id) : undefined;
  const r = !isVehicle ? G.rider(drawer.id) : undefined;
  const missing = isVehicle ? !v : !r;

  // The record vanished (e.g. it was removed on the server) — close, like the prototype's renderDrawer().
  useEffect(() => {
    if (missing) onClose();
  }, [missing, onClose]);
  if (missing) return null;

  if (isVehicle && v) {
    return (
      <Drawer width={620} eyebrow="Vehicle record" title={v.regNo} subtitle={<><AssetBadge status={v.status} /><VFlags v={v} /></>} closing={drawer.closing} onClose={onClose}>
        <VehicleDrawerBody v={v} fin={drawer.fin} onFin={onFin} />
      </Drawer>
    );
  }
  if (r) {
    return (
      <Drawer
        width={640}
        eyebrow="Rider"
        title={r.name}
        subtitle={
          <>
            {r.customerId ? <span className="cell-mono">{r.customerId}</span> : <Badge tone="amber">Applicant</Badge>}
            {r.status ? <AssetBadge status={r.status} /> : null}
          </>
        }
        closing={drawer.closing}
        onClose={onClose}
      >
        <RiderDrawerBody r={r} fin={drawer.fin} onFin={onFin} />
      </Drawer>
    );
  }
  return null;
}
