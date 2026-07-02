import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import "../App.css";

export type ToastKind = "success" | "error" | "warning" | "info";

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

export interface ToastProps {
  message: string;
  kind?: ToastKind;
  isVisible: boolean;
  durationMs?: number;
}

export function Toast({ message, kind = "info", isVisible, durationMs = 3000 }: ToastProps) {
  if (!isVisible) return null;

  const Icon = TOAST_ICONS[kind];

  return (
    <div
      className="toast-container"
      style={{ "--toast-duration": `${durationMs}ms` } as CSSProperties}
    >
      <div className={`toast-message toast-${kind}`} role="status" aria-live="polite">
        <Icon size={16} className="toast-icon" aria-hidden="true" />
        <span className="toast-text">{message}</span>
      </div>
    </div>
  );
}
