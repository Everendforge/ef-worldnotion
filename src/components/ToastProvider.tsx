import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastKind } from "./Toast";

export const TOAST_DURATION_MS: Record<ToastKind, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 5000,
};

type ToastEntry = { message: string; kind: ToastKind };

export type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<{ showToast: ShowToast } | undefined>(undefined);

export function useToast(): { showToast: ShowToast } {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastEntry[]>([]);
  const [active, setActive] = useState<ToastEntry>();

  const showToast = useCallback<ShowToast>((message, kind = "info") => {
    setQueue((current) => [...current, { message, kind }]);
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- serial queue promotion
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(undefined), TOAST_DURATION_MS[active.kind]);
    return () => window.clearTimeout(timer);
  }, [active]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={active?.message ?? ""}
        kind={active?.kind}
        isVisible={Boolean(active)}
        durationMs={active ? TOAST_DURATION_MS[active.kind] : undefined}
      />
    </ToastContext.Provider>
  );
}
