import { useMemo } from "react";
import { ImagePlus, PanelTop, UserRound } from "lucide-react";
import type { Entity, VaultIndex } from "../domain";
import type { PropertiesConfig } from "../editorTypes";
import { updateFrontmatterProperties } from "../utils/propertiesConfig";
import {
  getEntityTypeDefinition,
  getPresentationRolePropertyId,
  getPresentationRoleValue,
  listPresentationImageProperties,
  updateEntityTypePresentation,
  type PresentationRole,
} from "../utils/entityPresentation";
import { parseFrontmatterRaw } from "../utils/propertiesConfig";
import { ImageField } from "./properties/fields/ImageField";
import {
  BASE_VARIANT_ID,
  resolveVariantFrontmatter,
  setVariantOverride,
  updateVariantsInRawYaml,
} from "../utils/noteVariants";

type PresentationEditorProps = {
  entity: Entity;
  config: PropertiesConfig;
  rawYaml: string;
  vaultIndex: VaultIndex;
  onUpdateRawYaml: (yaml: string) => void;
  onUpdatePropertiesConfig?: (config: PropertiesConfig) => void | Promise<void>;
  onRequestImage?: () => Promise<{ path: string; alt?: string } | null>;
  activeVariantId?: string;
};

const ROLE_COPY: Record<
  PresentationRole,
  { label: string; description: string; Icon: typeof UserRound }
> = {
  portrait: {
    label: "Portrait",
    description: "A vertical image beside the note title.",
    Icon: UserRound,
  },
  cover: {
    label: "Cover",
    description: "A panoramic image above the note.",
    Icon: PanelTop,
  },
};

export function PresentationEditor({
  entity,
  config,
  rawYaml,
  vaultIndex,
  onUpdateRawYaml,
  onUpdatePropertiesConfig,
  onRequestImage,
  activeVariantId = BASE_VARIANT_ID,
}: PresentationEditorProps) {
  const type = getEntityTypeDefinition(config, entity.type);
  const imageProperties = useMemo(
    () => listPresentationImageProperties(config, entity.type),
    [config, entity.type],
  );
  const rawFrontmatter = useMemo(() => parseFrontmatterRaw(rawYaml), [rawYaml]);
  const frontmatter = useMemo(
    () => resolveVariantFrontmatter(rawFrontmatter, activeVariantId),
    [activeVariantId, rawFrontmatter],
  );

  if (!type) {
    return (
      <div className="presentation-empty-state">
        <PanelTop size={20} aria-hidden="true" />
        <strong>Presentation is unavailable</strong>
        <p>
          This note uses the custom type “{entity.type}”, which is not defined in this universe.
        </p>
      </div>
    );
  }

  const setRoleProperty = (role: PresentationRole, propertyId: string) => {
    const next = updateEntityTypePresentation(config, type.id, role, propertyId || undefined);
    void onUpdatePropertiesConfig?.(next);
  };

  const setRoleValue = (role: PresentationRole, value: unknown) => {
    const propertyId = getPresentationRolePropertyId(config, type.id, role);
    if (!propertyId) return;
    if (activeVariantId !== BASE_VARIANT_ID) {
      onUpdateRawYaml(
        updateVariantsInRawYaml(
          rawYaml,
          setVariantOverride(rawFrontmatter, config, activeVariantId, propertyId, value),
          config,
          type.id,
        ),
      );
      return;
    }
    onUpdateRawYaml(updateFrontmatterProperties(rawYaml, { [propertyId]: value }, config, type.id));
  };

  return (
    <div className="presentation-editor">
      <header className="presentation-editor-heading">
        <div>
          <span className="presentation-editor-eyebrow">{type.label}</span>
          <h3>Presentation{activeVariantId !== BASE_VARIANT_ID ? " variant" : ""}</h3>
        </div>
        <p>
          Configure the visual roles for every {type.label} note, then assign this note’s images.
        </p>
      </header>

      {imageProperties.length === 0 ? (
        <div className="presentation-empty-state">
          <ImagePlus size={20} aria-hidden="true" />
          <strong>Enable an image property first</strong>
          <p>Create an Image property in Properties and make it available to {type.label}.</p>
        </div>
      ) : (
        (["portrait", "cover"] as PresentationRole[]).map((role) => {
          const { Icon, label, description } = ROLE_COPY[role];
          const propertyId = getPresentationRolePropertyId(config, type.id, role);
          const value = getPresentationRoleValue(config, type.id, frontmatter, role) ?? "";
          return (
            <section className="presentation-role-card" key={role}>
              <div className="presentation-role-heading">
                <Icon size={16} aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                </div>
              </div>
              <label className="presentation-role-select">
                <span>Image property</span>
                <select
                  value={propertyId ?? ""}
                  onChange={(event) => setRoleProperty(role, event.target.value)}
                  disabled={!onUpdatePropertiesConfig}
                >
                  <option value="">Not enabled</option>
                  {imageProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.label ?? property.id}
                    </option>
                  ))}
                </select>
              </label>
              {propertyId ? (
                <div className="presentation-role-assignment">
                  <ImageField
                    value={value}
                    onChange={(nextValue) => setRoleValue(role, nextValue)}
                    vaultIndex={vaultIndex}
                    onRequestImage={onRequestImage}
                  />
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
