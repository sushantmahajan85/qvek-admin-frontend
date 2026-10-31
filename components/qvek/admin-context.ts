"use client";

import { createContext, useContext } from "react";
import type { KycKey, RecoveryStep } from "@/lib/qvek/types";

/** Cross-page actions (drawers, modal flows, navigation helpers) shared by pages and the shell. */
export interface AdminApi {
  openRider(id: string): void;
  openVehicle(id: string): void;
  closeDrawer(): void;

  control(vehicleId: string, op: "immobilize" | "reactivate"): void;
  copyRecoveryLink(vehicleId: string, recId: string): Promise<void>;
  recoveryStep(recId: string, step: Exclude<RecoveryStep, "shared">): void;
  manualRecovery(): void;

  approve(riderId: string): void;
  reject(riderId: string): void;
  viewDoc(riderId: string, key: KycKey): void;
  editRider(riderId: string): void;
  editKyc(riderId: string): void;
  riderStatus(riderId: string): void;
  vehicleStatus(vehicleId: string): void;
  editComponents(vehicleId: string): void;
  addRider(): void;
  deleteRider(riderId: string): void;
  addVehicle(): void;
  importVehicles(): void;
  deleteVehicle(vehicleId: string): void;
  finDetail(entryId: string): void;

  goReplace(riderId: string): void;
  goAssign(riderId: string): void;
  goAssignVehicle(vehicleId: string): void;
  showOnMap(vehicleId: string): void;

  logout(): void;
}

export const AdminContext = createContext<AdminApi | null>(null);

export function useAdmin(): AdminApi {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}
