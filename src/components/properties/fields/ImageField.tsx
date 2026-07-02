import { useMemo, useRef, useState } from "react";
import { Image, X } from "lucide-react";
import type { VaultIndex } from "../../../domain";
import { isImagePath, useVaultImage } from "../../../utils/vaultImages";
import { PickerPopover } from "../PickerPopover";
import { filePickerItems } from "./FileField";

export type ImageFieldProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  vaultIndex: VaultIndex;
};

/**
 * Image reference picked from the vault's image files, with an inline
 * preview (Tauri reads the file via read_file_base64; browser mode uses the
 * directory handle). Stored value is the vault-relative path.
 */
export function ImageField({ value, onChange, readOnly, vaultIndex }: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const stringValue = typeof value === "string" ? value : "";
  const items = useMemo(() => filePickerItems(vaultIndex, isImagePath), [vaultIndex]);
  const { url, error } = useVaultImage(vaultIndex, stringValue);

  return (
    <div className="image-field">
      <div className="image-field-controls">
        <button
          ref={anchorRef}
          type="button"
          className={`entity-ref-chip ${stringValue ? "" : "entity-ref-empty"}`}
          onClick={() => !readOnly && setOpen((current) => !current)}
          disabled={readOnly}
          title={stringValue || "Pick an image from the vault"}
        >
          <Image size={12} aria-hidden="true" />
          <span className="entity-ref-chip-label">{stringValue || "Pick image…"}</span>
        </button>
        {stringValue && !readOnly ? (
          <button
            type="button"
            className="entity-ref-action"
            onClick={() => onChange("")}
            title="Clear image"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>
      {url ? (
        <div className="image-field-preview">
          <img src={url} alt={stringValue} />
        </div>
      ) : null}
      {stringValue && error ? <div className="image-field-error">{error}</div> : null}
      <PickerPopover
        open={open}
        anchorRef={anchorRef}
        items={items}
        placeholder="Search vault images…"
        emptyLabel="No images in vault"
        onSelect={(item) => onChange(item.id)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
