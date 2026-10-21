"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { Icon } from "./icon";
import { FOCUSABLE, useLayer, useModal, type ConfirmOptions } from "./ui-context";

export interface ModalAction {
  label: string;
  kind?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  icon?: string;
  /** Value the modal promise resolves with when this action closes the dialog. */
  value?: unknown;
  /** Set to false to run `onClick` without closing. */
  close?: boolean;
  disabled?: boolean;
  /** Shows a spinner + this text and disables the button. */
  busy?: string;
  /** Return `false` to keep the dialog open (e.g. validation failed). */
  onClick?: () => boolean | void | Promise<boolean | void>;
}

interface ModalProps {
  size?: "sm" | "md" | "lg" | "xl";
  title: string;
  subtitle?: ReactNode;
  icon?: string;
  tone?: "primary" | "danger" | "warning";
  dismissible?: boolean;
  actions?: ModalAction[];
  children?: ReactNode;
}

/** The prototype's `QV.ui.modal` frame: backdrop, dialog, focus trap, Esc / backdrop dismissal. */
export function Modal({ size = "md", title, subtitle, icon, tone = "primary", dismissible = true, actions, children }: ModalProps) {
  const { close, closing } = useModal();
  const isTop = useLayer();
  const titleId = useId();
  const dlgRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  // Enter animation + initial focus (first focusable element, like the prototype).
  useEffect(() => {
    prevRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      setShown(true);
      const dlg = dlgRef.current;
      if (!dlg) return;
      const target = dlg.querySelector<HTMLElement>("[autofocus]") || dlg.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Restore focus to whatever opened the dialog.
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
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        close(undefined);
      }
      if (e.key === "Tab") {
        const dlg = dlgRef.current;
        if (!dlg) return;
        const f = Array.from(dlg.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [close, dismissible, isTop]);

  const runAction = async (a: ModalAction) => {
    if (a.onClick) {
      const r = await a.onClick();
      if (r === false) return;
    }
    if (a.close !== false) close(a.value);
  };

  return (
    <div
      className={"qv-backdrop" + (shown && !closing ? " is-in" : "")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) close(undefined);
      }}
    >
      <div ref={dlgRef} className={"qv-modal qv-modal--" + size} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="qv-modal__head">
          {icon ? (
            <span className={"qv-modal__icon qv-modal__icon--" + tone}>
              <Icon name={icon} size={22} />
            </span>
          ) : null}
          <div className="qv-modal__titles">
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {dismissible ? (
            <button className="qv-modal__x" type="button" aria-label="Close dialog" onClick={() => close(undefined)}>
              <Icon name="x" size={18} />
            </button>
          ) : null}
        </div>
        <div className="qv-modal__body">{children}</div>
        {actions && actions.length ? (
          <div className="qv-modal__foot">
            {actions.map((a, i) => (
              <Button key={i} variant={a.kind || "ghost"} disabled={a.disabled || !!a.busy} onClick={() => runAction(a)}>
                {a.busy ? (
                  <>
                    <span className="spinner" /> {a.busy}
                  </>
                ) : (
                  <>
                    {a.icon ? <Icon name={a.icon} size={18} /> : null}
                    <span>{a.label}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** `QV.ui.confirm` — a small confirm dialog resolving to `true` / `false`. */
export function ConfirmModal(o: ConfirmOptions) {
  const danger = o.kind === "danger";
  return (
    <Modal
      title={o.title}
      icon={o.icon || (danger ? "alert" : "info")}
      tone={danger ? "danger" : o.tone || "primary"}
      size="sm"
      actions={[
        { label: o.cancelLabel || "Cancel", kind: "ghost", value: false },
        { label: o.confirmLabel || "Confirm", kind: danger ? "danger" : "primary", value: true, icon: o.confirmIcon },
      ]}
    >
      <div className="qv-confirm">{o.body}</div>
    </Modal>
  );
}
