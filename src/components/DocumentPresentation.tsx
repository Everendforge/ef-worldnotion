import type { VaultIndex } from "../domain";
import { useVaultImage } from "../utils/vaultImages";

type DocumentPresentationProps = {
  vaultIndex: VaultIndex;
  name: string;
  typeLabel: string;
  portraitPath?: string;
  coverPath?: string;
};

/** Visual-only header. Its images are stored by normal image properties in YAML. */
export function DocumentPresentation({
  vaultIndex,
  name,
  typeLabel,
  portraitPath,
  coverPath,
}: DocumentPresentationProps) {
  const portrait = useVaultImage(vaultIndex, portraitPath ?? "");
  const cover = useVaultImage(vaultIndex, coverPath ?? "");
  // A configured but unavailable file must not leave a blank media frame. The
  // title remains available, and the generic CodeMirror header stays suppressed.
  if (!portraitPath && !coverPath) return null;

  return (
    <header className="document-presentation" aria-label={`${name} presentation`}>
      {cover.url ? (
        <div className="document-presentation-cover">
          <img src={cover.url} alt="" />
        </div>
      ) : null}
      <div className={`document-presentation-title ${cover.url ? "has-cover" : ""}`}>
        {portrait.url ? (
          <img
            className="document-presentation-portrait"
            src={portrait.url}
            alt={`${name} portrait`}
          />
        ) : null}
        <div>
          <p>{typeLabel}</p>
          <h1>{name}</h1>
        </div>
      </div>
    </header>
  );
}
