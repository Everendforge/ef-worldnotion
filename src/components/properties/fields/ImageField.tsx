import { useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import type { VaultIndex } from "../../../domain";
import { isImagePath, useVaultImage } from "../../../utils/vaultImages";
import { PickerPopover, type PickerAction } from "../PickerPopover";
import { filePickerItems } from "./FileField";

export type ImageFieldProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  vaultIndex: VaultIndex;
  onRequestImage?: () => Promise<{ path: string; alt?: string } | null>;
};

/**
 * Image reference picked from the vault or imported from the computer, with
 * an inline preview (Tauri reads the file via read_file_base64; browser mode
 * uses the directory handle). Stored value is always the vault-relative path.
 *
 * Empty: a single "Pick image" button opening a unified picker (vault search +
 * an "Upload from computer" action). Chosen: the preview plus two clear
 * actions — Replace and Remove.
 */
export function ImageField({
  value,
  onChange,
  readOnly,
  vaultIndex,
  onRequestImage,
}: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const pickButtonRef = useRef<HTMLButtonElement>(null);
  const replaceButtonRef = useRef<HTMLButtonElement>(null);
  const stringValue = typeof value === "string" ? value : "";
  const items = useMemo(() => filePickerItems(vaultIndex, isImagePath), [vaultIndex]);
  const { url, error } = useVaultImage(vaultIndex, stringValue);

  const uploadImage = async () => {
    if (!onRequestImage || readOnly || uploading) return;
    setOpen(false);
    setUploading(true);
    setUploadError("");
    try {
      const image = await onRequestImage();
      if (image) onChange(image.path);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error ? uploadFailure.message : "Could not upload image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const pickerActions: PickerAction[] =
    onRequestImage && !readOnly
      ? [
          {
            id: "upload",
            label: "Upload from computer",
            icon: <ImagePlus size={13} aria-hidden="true" />,
            onSelect: () => void uploadImage(),
          },
        ]
      : [];

  const anchorRef = stringValue ? replaceButtonRef : pickButtonRef;

  return (
    <div className="image-field">
      {stringValue ? (
        <>
          {url ? (
            <div className="image-field-preview">
              <img src={url} alt={stringValue} />
            </div>
          ) : null}
          {!readOnly ? (
            <div className="image-field-actions">
              <button
                ref={replaceButtonRef}
                type="button"
                className="image-field-action"
                onClick={() => setOpen((current) => !current)}
                disabled={uploading}
                title={stringValue}
              >
                <RefreshCw size={13} aria-hidden="true" />
                {uploading ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                className="image-field-action image-field-action-danger"
                onClick={() => onChange("")}
                title="Remove image"
              >
                <Trash2 size={13} aria-hidden="true" />
                Remove
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <button
          ref={pickButtonRef}
          type="button"
          className="image-field-empty"
          onClick={() => !readOnly && setOpen((current) => !current)}
          disabled={readOnly || uploading}
        >
          <ImagePlus size={15} aria-hidden="true" />
          <span>{uploading ? "Uploading…" : "Pick image"}</span>
        </button>
      )}
      {stringValue && error ? <div className="image-field-error">{error}</div> : null}
      {uploadError ? (
        <div className="image-field-error" role="alert">
          {uploadError}
        </div>
      ) : null}
      <PickerPopover
        open={open}
        anchorRef={anchorRef}
        items={items}
        actions={pickerActions}
        placeholder="Search vault images…"
        emptyLabel="No images in vault"
        onSelect={(item) => onChange(item.id)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
