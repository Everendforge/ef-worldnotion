import { describe, expect, it } from "vitest";
import type { VaultIndex } from "../domain";
import type { ExplorerFavorite, OpenTab } from "../editorTypes";
import {
  dirtyTabPathsAffectedByTree,
  favoritesOutsideTree,
  movePathChange,
  movePathProblem,
  planFolderDescriptionRename,
  renamePathChange,
  renamePathTarget,
} from "./vaultOperations";

const index: VaultIndex = {
  rootPath: "C:/Vault",
  files: [
    { relativePath: "World/Cast.md", content: "---\nname: Cast\nfolder: Cast\n---\n\n# Cast\n" },
    { relativePath: "World/Existing.md", content: "" },
  ],
  directories: ["World", "World/Cast"],
  markdownFiles: [],
  templates: [],
  universes: [],
  tree: [],
  entities: [],
  findings: [],
  readErrors: [],
  typeCounts: {},
};

function tab(path: string, dirty: boolean): OpenTab {
  return {
    path,
    title: path,
    rawMarkdown: "",
    savedMarkdown: "",
    dirty,
    mode: "write",
    isTemplate: false,
  };
}

describe("vault operation helpers", () => {
  it("plans folder description rename and content rewrite", () => {
    const plan = planFolderDescriptionRename(index, "World/Cast", "Characters");

    expect(plan).toMatchObject({
      oldDescriptionPath: "World/Cast.md",
      newDescriptionPath: "World/Characters.md",
      newFileName: "Characters.md",
      change: { fromPath: "World/Cast.md", toPath: "World/Characters.md", mode: "single" },
    });
    expect(plan?.content).toContain("name: Characters");
    expect(plan?.content).toContain("folder: Characters");
    expect(plan?.content).toContain("# Characters");
  });

  it("rejects folder description rename conflicts", () => {
    expect(() => planFolderDescriptionRename(index, "World/Cast", "Existing")).toThrow(
      "Cannot rename folder description because World/Existing.md already exists.",
    );
  });

  it("computes rename and move changes consistently", () => {
    expect(renamePathTarget("World/Cast/Ada.md", "Mara.md")).toBe("World/Cast/Mara.md");
    expect(renamePathChange("World/Cast", "Characters", "folder")).toEqual({
      fromPath: "World/Cast",
      toPath: "World/Characters",
      mode: "tree",
    });
    expect(movePathChange("World/Cast/Ada.md", "Archive")).toEqual({
      fromPath: "World/Cast/Ada.md",
      toPath: "Archive/Ada.md",
      mode: "tree",
    });
  });

  it("detects unsafe or redundant moves", () => {
    expect(movePathProblem("World/Cast", "World/Cast/Inner", "folder")).toBe("Cannot move a folder into itself.");
    expect(movePathProblem("World/Cast/Ada.md", "World/Cast", "file")).toBe("already-there");
    expect(movePathProblem("World/Cast/Ada.md", "Archive", "file")).toBeUndefined();
  });

  it("finds dirty tabs and favorites affected by a tree operation", () => {
    const tabs = [tab("World/Cast/Ada.md", true), tab("World/Cast/Clean.md", false), tab("Other.md", true)];
    const favorites: ExplorerFavorite[] = [
      { path: "World/Cast", kind: "folder", label: "Cast" },
      { path: "World/Cast/Ada.md", kind: "file", label: "Ada" },
      { path: "Other.md", kind: "file", label: "Other" },
    ];

    expect(dirtyTabPathsAffectedByTree(tabs, "World/Cast")).toEqual(["World/Cast/Ada.md"]);
    expect(favoritesOutsideTree(favorites, "World/Cast")).toEqual([
      { path: "Other.md", kind: "file", label: "Other" },
    ]);
  });
});
