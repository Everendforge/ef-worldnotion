import { useEffect, useRef, useState } from "react";
import { Check, CircleDot } from "lucide-react";

export interface SaveStatusIndicatorProps {
  /** Path of the active document, used to ignore dirty flips caused by tab switches. */
  path?: string;
  dirty: boolean;
}

/**
 * Shows "Unsaved" while the active document has pending changes and a
 * transient "Saved" check right after a save completes.
 */
export function SaveStatusIndicator({ path, dirty }: SaveStatusIndicatorProps) {
  const [justSaved, setJustSaved] = useState(false);
  const previousRef = useRef<{ path?: string; dirty: boolean }>({ path, dirty });

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { path, dirty };
    if (previous.path !== path) {
      setJustSaved(false);
      return;
    }
    if (previous.dirty && !dirty) {
      setJustSaved(true);
      const timer = window.setTimeout(() => setJustSaved(false), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [path, dirty]);

  if (!path) return null;

  if (dirty) {
    return (
      <span className="save-status save-status-dirty" title="Unsaved changes" role="status">
        <CircleDot size={11} aria-hidden="true" />
        Unsaved
      </span>
    );
  }

  if (justSaved) {
    return (
      <span className="save-status save-status-saved" role="status">
        <Check size={11} aria-hidden="true" />
        Saved
      </span>
    );
  }

  return null;
}
