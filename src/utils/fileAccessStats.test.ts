import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettingsV4 } from "../editorTypes";
import { loadSettings } from "../settings";
import { incrementFileAccess, recordFileAccessInSettings } from "./fileAccessStats";

describe("file access stats", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("increments existing entries and creates new file access stats", () => {
    const stats = incrementFileAccess(
      {
        rootPath: "C:/Vault",
        tabs: [],
        fileAccessStats: [{ path: "Notes/Ada.md", count: 2, lastAccessed: 1 }],
      },
      "Notes/Ada.md",
    );

    expect(stats).toEqual([
      {
        path: "Notes/Ada.md",
        count: 3,
        lastAccessed: Date.now(),
      },
    ]);

    expect(incrementFileAccess({ rootPath: "C:/Vault", tabs: [] }, "Notes/New.md")).toEqual([
      {
        path: "Notes/New.md",
        count: 1,
        lastAccessed: Date.now(),
      },
    ]);
  });

  it("records file access inside existing settings sessions", () => {
    const settings: AppSettingsV4 = {
      ...loadSettings(),
      sessions: {
        "C:/Vault": {
          rootPath: "C:/Vault",
          activePath: "Notes/Ada.md",
          tabs: [
            { path: "Notes/Ada.md", title: "Ada", mode: "write", modifiedMs: 1, isTemplate: false },
          ],
          fileAccessStats: [{ path: "Notes/Ada.md", count: 1, lastAccessed: 1 }],
        },
      },
    };

    const next = recordFileAccessInSettings(settings, "C:/Vault", "Notes/Ada.md");

    expect(next.sessions["C:/Vault"]).toMatchObject({
      rootPath: "C:/Vault",
      activePath: "Notes/Ada.md",
      tabs: settings.sessions["C:/Vault"].tabs,
      fileAccessStats: [{ path: "Notes/Ada.md", count: 2, lastAccessed: Date.now() }],
    });
    expect(next.recentUniverses).toBe(settings.recentUniverses);
  });

  it("creates a minimal session when recording access for a new root", () => {
    const next = recordFileAccessInSettings(loadSettings(), "C:/Vault", "Notes/Ada.md");

    expect(next.sessions["C:/Vault"]).toEqual({
      rootPath: "C:/Vault",
      tabs: [],
      fileAccessStats: [{ path: "Notes/Ada.md", count: 1, lastAccessed: Date.now() }],
    });
  });
});
