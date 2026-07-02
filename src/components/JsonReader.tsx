import type { CSSProperties } from "react";

type JsonReaderProps = {
  value: string;
};

function valueType(value: unknown) {
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value === null) return "null";
  if (typeof value === "object")
    return `Object(${Object.keys(value as Record<string, unknown>).length})`;
  return typeof value;
}

function renderScalar(value: unknown) {
  if (typeof value === "string") return <span className="json-reader-string">"{value}"</span>;
  if (typeof value === "number") return <span className="json-reader-number">{value}</span>;
  if (typeof value === "boolean")
    return <span className="json-reader-boolean">{String(value)}</span>;
  if (value === null) return <span className="json-reader-null">null</span>;
  return <span>{String(value)}</span>;
}

function JsonNode({ label, value, depth = 0 }: { label?: string; value: unknown; depth?: number }) {
  const isObject = value !== null && typeof value === "object";
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : isObject
      ? Object.entries(value as Record<string, unknown>)
      : [];

  if (!isObject) {
    return (
      <div className="json-reader-row" style={{ "--json-depth": depth } as CSSProperties}>
        {label !== undefined ? <span className="json-reader-key">{label}</span> : null}
        {label !== undefined ? <span className="json-reader-separator">:</span> : null}
        {renderScalar(value)}
      </div>
    );
  }

  return (
    <details className="json-reader-node" open={depth < 2}>
      <summary className="json-reader-row" style={{ "--json-depth": depth } as CSSProperties}>
        {label !== undefined ? <span className="json-reader-key">{label}</span> : null}
        {label !== undefined ? <span className="json-reader-separator">:</span> : null}
        <span className="json-reader-type">{valueType(value)}</span>
      </summary>
      <div>
        {entries.map(([key, child]) => (
          <JsonNode key={key} label={key} value={child} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

export function JsonReader({ value }: JsonReaderProps) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    return (
      <div className="json-reader json-reader-error">
        <strong>Invalid JSON</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }

  return (
    <div className="json-reader">
      <JsonNode value={parsed} />
    </div>
  );
}
