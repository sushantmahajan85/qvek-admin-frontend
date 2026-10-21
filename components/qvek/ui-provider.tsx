"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { subscribeToasts } from "@/lib/toast";
import { Icon } from "./icon";
import { ConfirmModal } from "./modal";
import {
  ModalContext,
  UIContext,
  reduceMotion,
  type ConfirmOptions,
  type ToastOptions,
  type ToastType,
  type UIApi,
} from "./ui-context";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
}

interface ModalEntry {
  id: number;
  node: ReactNode;
  closing: boolean;
}

const TOAST_ICON: Record<ToastType, string> = { success: "checkCircle", error: "alertCircle", warning: "alert", info: "info" };

function ToastView({ t, onDone }: { t: ToastItem; onDone: (id: number) => void }) {
  const [isIn, setIn] = useState(false);
  const closingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIn(false);
    setTimeout(() => onDone(t.id), reduceMotion() ? 0 : 220);
  }, [onDone, t.id]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIn(true));
    const timer = setTimeout(dismiss, t.duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [dismiss, t.duration]);

  return (
    <div className={"qv-toast qv-toast--" + t.type + (isIn ? " is-in" : "")}>
      <span className="qv-toast__icon">
        <Icon name={TOAST_ICON[t.type]} size={18} />
      </span>
      <div className="qv-toast__body">
        {t.title ? <strong>{t.title}</strong> : null}
        <span>{t.message}</span>
      </div>
      <button className="qv-toast__close" type="button" aria-label="Dismiss notification" onClick={dismiss}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall back */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Hosts toasts, modals/confirm dialogs and the layer stack (Esc / focus-trap ordering). */
export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modals, setModals] = useState<ModalEntry[]>([]);
  const seq = useRef(0);
  const layerSeq = useRef(0);
  const layerStack = useRef<number[]>([]);
  const resolvers = useRef(new Map<number, (v: unknown) => void>());

  const removeToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const closeModal = useCallback((id: number, value?: unknown) => {
    const resolve = resolvers.current.get(id);
    if (!resolve) return;
    resolvers.current.delete(id);
    resolve(value);
    setModals((ms) => ms.map((m) => (m.id === id ? { ...m, closing: true } : m)));
    setTimeout(() => setModals((ms) => ms.filter((m) => m.id !== id)), reduceMotion() ? 0 : 220);
  }, []);

  const api = useMemo<UIApi>(() => {
    function open<T = unknown>(node: ReactNode) {
      seq.current += 1;
      const id = seq.current;
      return new Promise<T | undefined>((resolve) => {
        resolvers.current.set(id, resolve as (v: unknown) => void);
        setModals((ms) => [...ms, { id, node, closing: false }]);
      });
    }
    return {
      toast(message: string, opts: ToastOptions = {}) {
        seq.current += 1;
        const item: ToastItem = { id: seq.current, message, type: opts.type || "success", title: opts.title, duration: opts.duration || 3600 };
        setToasts((ts) => [...ts, item]);
      },
      open,
      confirm: (o: ConfirmOptions) => open<boolean>(<ConfirmModal {...o} />).then((v) => v === true),
      copy: copyText,
      hasLayers: () => layerStack.current.length > 0,
      layers: {
        push() {
          layerSeq.current += 1;
          layerStack.current.push(layerSeq.current);
          return layerSeq.current;
        },
        pop(id: number) {
          layerStack.current = layerStack.current.filter((x) => x !== id);
        },
        isTop(id: number) {
          return layerStack.current[layerStack.current.length - 1] === id;
        },
      },
    };
  }, []);

  // Toasts raised by the data hooks (features/*/hooks.ts) go through the shared bus in lib/toast.
  useEffect(() => subscribeToasts((e) => api.toast(e.message, { type: e.kind, title: e.title })), [api]);

  return (
    <UIContext.Provider value={api}>
      {children}
      {modals.map((m) => (
        <ModalContext.Provider key={m.id} value={{ closing: m.closing, close: (v) => closeModal(m.id, v) }}>
          {m.node}
        </ModalContext.Provider>
      ))}
      <div className="qv-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastView key={t.id} t={t} onDone={removeToast} />
        ))}
      </div>
    </UIContext.Provider>
  );
}
