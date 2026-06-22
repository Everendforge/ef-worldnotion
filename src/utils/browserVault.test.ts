import { describe, expect, it } from "vitest";
import { browserPathParts, validateBrowserPathSegment } from "./browserVault";

describe("browser vault path validation", () => {
  it("accepts safe relative vault paths and root when explicitly allowed", () => {
    expect(browserPathParts("World/Characters/Ada.md")).toEqual(["World", "Characters", "Ada.md"]);
    expect(browserPathParts(".everend/universe.json")).toEqual([".everend", "universe.json"]);
    expect(browserPathParts(".everend/.pathbranching/manifest.json")).toEqual([
      ".everend",
      ".pathbranching",
      "manifest.json",
    ]);
    expect(browserPathParts("", { allowRoot: true })).toEqual([]);
  });

  it("rejects absolute, traversal, empty, and backslash paths", () => {
    expect(() => browserPathParts("")).toThrow("Path is required.");
    expect(() => browserPathParts("../outside.md")).toThrow("Browser vault paths cannot contain empty or traversal segments.");
    expect(() => browserPathParts("World//Ada.md")).toThrow("Browser vault paths cannot contain empty or traversal segments.");
    expect(() => browserPathParts("C:/Vault/Ada.md")).toThrow("Browser vault paths must be relative.");
    expect(() => browserPathParts("/Vault/Ada.md")).toThrow("Browser vault paths must be relative.");
    expect(() => browserPathParts("World\\Ada.md")).toThrow("Browser vault paths must use forward slashes.");
  });

  it("allows only the .everend hidden segment", () => {
    expect(() => browserPathParts(".secret/Ada.md")).toThrow(
      "Browser vault paths can only use .everend and .everend/.pathbranching as hidden segments.",
    );
    expect(() => browserPathParts("World/.secret.md")).toThrow(
      "Browser vault paths can only use .everend and .everend/.pathbranching as hidden segments.",
    );
    expect(() => browserPathParts(".pathbranching/manifest.json")).toThrow(
      "Browser vault paths can only use .everend and .everend/.pathbranching as hidden segments.",
    );
    expect(() => browserPathParts(".everend/.other/manifest.json")).toThrow(
      "Browser vault paths can only use .everend and .everend/.pathbranching as hidden segments.",
    );
  });

  it("validates rename segments as single safe names", () => {
    expect(() => validateBrowserPathSegment("Ada.md")).not.toThrow();
    expect(() => validateBrowserPathSegment("Nested/Ada.md")).toThrow(
      "Browser vault path segments cannot contain separators or null bytes.",
    );
    expect(() => validateBrowserPathSegment("..")).toThrow(
      "Browser vault paths cannot contain empty or traversal segments.",
    );
  });
});
