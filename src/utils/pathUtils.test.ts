import { describe, expect, it } from "vitest";
import {
  activeCreationFolder,
  duplicatePathFor,
  fileTitle,
  pathAfterChanges,
  pathIsAffectedByChanges,
  pathName,
  relativeFromAbsolute,
  selectedAbsolutePath,
} from "./pathUtils";
import type { VaultIndex } from "../domain";

const minimalIndex: VaultIndex = {
  rootPath: "C:/Vault",
  files: [{ relativePath: "Notes/Mara.md", absolutePath: "D:/Vault/Notes/Mara.md", content: "" }],
  directories: ["Notes"],
  markdownFiles: [],
  templates: [],
  universes: [],
  tree: [
    {
      name: "Notes",
      path: "Notes",
      kind: "folder",
      children: [{ name: "Mara.md", path: "Notes/Mara.md", kind: "file", children: [] }],
    },
  ],
  entities: [],
  findings: [],
  readErrors: [],
  typeCounts: {},
};

describe("path utilities", () => {
  it("normalizes display names and absolute paths", () => {
    expect(pathName("browser:Demo/Notes/Mara.md")).toBe("Mara.md");
    expect(fileTitle("Notes/Mara.md")).toBe("Mara");
    expect(relativeFromAbsolute("C:/Vault", "C:/Vault/Notes/Mara.md")).toBe("Notes/Mara.md");
  });

  it("updates moved tree paths consistently", () => {
    const changes = { fromPath: "Notes", toPath: "Archive/Notes", mode: "tree" as const };

    expect(pathIsAffectedByChanges("Notes/Mara.md", changes)).toBe(true);
    expect(pathAfterChanges("Notes/Mara.md", changes)).toBe("Archive/Notes/Mara.md");
    expect(pathAfterChanges("Notes", changes)).toBe("Archive/Notes");
  });

  it("finds the next duplicate path", () => {
    expect(duplicatePathFor(minimalIndex, "Notes/Mara.md", "file")).toBe("Notes/Mara copy 1.md");
  });

  it("resolves selected absolute paths for reveal actions", () => {
    expect(selectedAbsolutePath(undefined, undefined)).toBeUndefined();
    expect(selectedAbsolutePath(minimalIndex, undefined)).toBe("C:/Vault");
    expect(selectedAbsolutePath(minimalIndex, "Notes/Mara.md")).toBe("D:/Vault/Notes/Mara.md");
    expect(selectedAbsolutePath(minimalIndex, "Notes/New.md")).toBe("C:/Vault/Notes/New.md");
  });

  it("chooses the active creation folder from explorer target or selected path", () => {
    expect(activeCreationFolder({ path: "Notes", kind: "folder" }, "Other/File.md")).toBe("Notes");
    expect(activeCreationFolder({ path: "Notes/Mara.md", kind: "file" }, undefined)).toBe("Notes");
    expect(activeCreationFolder(undefined, "World/Entry.md")).toBe("World");
    expect(activeCreationFolder(undefined, undefined)).toBe("");
  });
});
