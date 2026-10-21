"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Icon } from "./icon";
import { useLayer } from "./ui-context";

interface DrawerProps {
  width: number;
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  closing: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The prototype's right-hand slide-over panel (`QV.ui.drawer`). */
export function Drawer({ width, eyebrow, title, subtitle, closing, onClose, children }: DrawerProps) {
  const isTop = useLayer();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const prevRef = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    prevRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      setShown(true);
      panelRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (closing) {
      try {
        prevRef.current?.focus({ preventScroll: true });
      } catch {
        /* noop */
      }
    }
  }, [closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [isTop, onClose]);

  return (
    <div
      className={"qv-drawer-back" + (shown && !closing ? " is-in" : "")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className="qv-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ "--dw": width + "px" } as CSSProperties}
      >
        <header className="qv-drawer__head">
          <div>
            <p className="qv-drawer__eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            <p className="qv-drawer__sub">{subtitle}</p>
          </div>
          <button className="icon-btn" type="button" aria-label="Close panel" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="qv-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
