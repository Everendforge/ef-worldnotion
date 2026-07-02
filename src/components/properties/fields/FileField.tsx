import { useMemo, useRef, useState } from "react";
import { File, X } from "lucide-react";
import type { VaultIndex } from "../../../domain";
import { dirname } from "../../../domain";
import { PickerPopover, type PickerItem } from "../PickerPopover";

export function filePickerItems(
  vaultIndex: VaultIndex,
  filter?: (relativePath: string) => boolean,
): PickerItem[] {
  return vaultIndex.files
    .filter((file) => !filter || filter(file.relativePath))
    .map((file) => {
      const folder = dirname(file.relativePath);
      return {
        id: file.relativePath,
        label: file.relativePath.split("/").pop() ?? file.relativePath,
        sublabel: folder || "/",
        keywords: [file.relativePath],
      };
    });
}

export type FileFieldProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  vaultIndex: VaultIndex;
};

/**
 * Vault file reference picked from a fuzzy popover over the indexed files.
 * Stored value is the vault-relative path.
 */
export function FileField({ value, onChange, readOnly, vaultIndex }: FileFieldProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const stringValue = typeof value === "string" ? value : "";
  const items = useMemo(() => filePickerItems(vaultIndex), [vaultIndex]);

  return (
    <div className="file-field">
      <button
        ref={anchorRef}
        type="button"
        className={`entity-ref-chip ${stringValue ? "" : "entity-ref-empty"}`}
        onClick={() => !readOnly && setOpen((current) => !current)}
        disabled={readOnly}
        title={stringValue || "Pick a file from the vault"}
      >
        <File size={12} aria-hidden="true" />
        <span className="entity-ref-chip-label">{stringValue || "Pick file…"}</span>
      </button>
      {stringValue && !readOnly ? (
        <button
          type="button"
          className="entity-ref-action"
          onClick={() => onChange("")}
          title="Clear file"
        >
          <X size={12} />
        </button>
      ) : null}
      <PickerPopover
        open={open}
        anchorRef={anchorRef}
        items={items}
        placeholder="Search vault files…"
        emptyLabel="No files in vault"
        onSelect={(item) => onChange(item.id)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
