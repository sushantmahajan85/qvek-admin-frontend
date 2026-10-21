"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  kind?: "danger" | "primary";
  tone?: "primary" | "danger" | "warning";
  icon?: string;
  confirmLabel?: string;
  confirmIcon?: string;
  cancelLabel?: string;
}

export interface UIApi {
  toast(message: string, opts?: ToastOptions): void;
  /** Opens a modal element (usually a `<Modal>`); resolves with the value passed to `close()`. */
  open<T = unknown>(node: ReactNode): Promise<T | undefined>;
  confirm(o: ConfirmOptions): Promise<boolean>;
  copy(text: string): Promise<boolean>;
  /** True while any modal or drawer is open (used to pause background refreshes). */
  hasLayers(): boolean;
  layers: {
    push(): number;
    pop(id: number): void;
    isTop(id: number): boolean;
  };
}

export interface ModalCtx {
  close: (value?: unknown) => void;
  closing: boolean;
}

export const UIContext = createContext<UIApi | null>(null);
export const ModalContext = createContext<ModalCtx | null>(null);

export function useUI(): UIApi {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

export function useModal(): ModalCtx {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside a modal opened with ui.open()");
  return ctx;
}

/** Registers the calling modal/drawer on the layer stack; returns `isTop()` for Esc / Tab handling. */
export function useLayer(): () => boolean {
  const ui = useUI();
  const idRef = useRef(0);
  useEffect(() => {
    const id = ui.layers.push();
    idRef.current = id;
    return () => ui.layers.pop(id);
  }, [ui]);
  return useCallback(() => ui.layers.isTop(idRef.current), [ui]);
}

export const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
