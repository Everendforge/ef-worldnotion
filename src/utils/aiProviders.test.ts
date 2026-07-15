import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  aiProviderById,
  DEFAULT_AI_ADVISOR_SETTINGS,
  DEFAULT_AI_PROVIDER_ID,
  normalizeAiAdvisorSettings,
  normalizeAiProviderUrl,
} from "./aiProviders";

describe("AI provider catalog", () => {
  it("starts with ChatGPT and contains official HTTPS web app URLs", () => {
    expect(DEFAULT_AI_PROVIDER_ID).toBe("chatgpt");
    expect(AI_PROVIDERS.length).toBeGreaterThanOrEqual(6);
    expect(AI_PROVIDERS.every((provider) => provider.url.startsWith("https://"))).toBe(true);
  });

  it("falls back safely when resolving a known provider id", () => {
    expect(aiProviderById("claude").url).toBe("https://claude.ai/");
  });

  it("accepts custom HTTP(S) providers but rejects executable URL schemes", () => {
    expect(normalizeAiProviderUrl("https://local.example/chat")).toBe("https://local.example/chat");
    expect(normalizeAiProviderUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      normalizeAiAdvisorSettings({
        providers: [{ id: "custom", name: "Local", url: "http://localhost:11434", enabled: true }],
        activeProviderId: "custom",
      }),
    ).toMatchObject({ activeProviderId: "custom", providers: [{ id: "custom" }] });
  });

  it("provides a complete default settings object", () => {
    expect(DEFAULT_AI_ADVISOR_SETTINGS.providers.every((provider) => provider.enabled)).toBe(true);
  });
});
