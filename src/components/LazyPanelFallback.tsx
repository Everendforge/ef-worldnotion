export function LazyPanelFallback({ label = "Loading..." }: { label?: string }) {
  return <div className="lazy-panel-fallback">{label}</div>;
}
