// Tiny toast bus. The data hooks (features/*/hooks.ts) call `toast.success(...)` / `toast.error(...)`;
// the UI provider (components/qvek/ui-provider.tsx) subscribes and renders them with the admin
// panel's own toast component. Keeps the hooks free of any UI-library import.

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastEvent {
  kind: ToastKind;
  message: string;
  title?: string;
}

type Listener = (e: ToastEvent) => void;
const listeners = new Set<Listener>();

function emit(kind: ToastKind, message: string, title?: string) {
  listeners.forEach((fn) => fn({ kind, message, title }));
}

export function subscribeToasts(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const toast = {
  success: (message: string, title?: string) => emit('success', message, title),
  error: (message: string, title?: string) => emit('error', message, title),
  warning: (message: string, title?: string) => emit('warning', message, title),
  info: (message: string, title?: string) => emit('info', message, title),
};
