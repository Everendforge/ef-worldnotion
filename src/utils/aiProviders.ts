import type { AiAdvisorProvider, AiAdvisorSettings } from "../editorTypes";

export type AiProviderId = string;
export type AiProvider = AiAdvisorProvider;

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "OpenAI's conversational workspace.",
    url: "https://chatgpt.com/",
    enabled: true,
  },
  {
    id: "claude",
    name: "Claude",
    description: "Anthropic's conversational workspace.",
    url: "https://claude.ai/",
    enabled: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Google's Gemini web app.",
    url: "https://gemini.google.com/app",
    enabled: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek's official chat workspace.",
    url: "https://chat.deepseek.com/",
    enabled: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Web-grounded conversational research.",
    url: "https://www.perplexity.ai/",
    enabled: true,
  },
  {
    id: "mistral",
    name: "Mistral Vibe",
    description: "Mistral's Vibe chat workspace.",
    url: "https://chat.mistral.ai/",
    enabled: true,
  },
  {
    id: "grok",
    name: "Grok",
    description: "xAI's conversational workspace.",
    url: "https://grok.com/",
    enabled: true,
  },
  {
    id: "qwen",
    name: "Qwen",
    description: "Alibaba's Qwen chat workspace.",
    url: "https://chat.qwen.ai/",
    enabled: true,
  },
];

export const DEFAULT_AI_PROVIDER_ID: AiProviderId = "chatgpt";

export const DEFAULT_AI_ADVISOR_SETTINGS: AiAdvisorSettings = {
  providers: AI_PROVIDERS.map((provider) => ({ ...provider })),
  activeProviderId: DEFAULT_AI_PROVIDER_ID,
};

export function normalizeAiProviderUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function normalizeAiAdvisorSettings(value: unknown): AiAdvisorSettings {
  const raw = value && typeof value === "object" ? (value as Partial<AiAdvisorSettings>) : {};
  const candidates = Array.isArray(raw.providers) ? raw.providers : [];
  const seenIds = new Set<string>();
  const providers = candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<AiProvider>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const url = normalizeAiProviderUrl(item.url);
    if (!id || !name || !url || seenIds.has(id)) return [];
    seenIds.add(id);
    return [
      {
        id,
        name,
        url,
        enabled: item.enabled !== false,
        description: typeof item.description === "string" ? item.description : undefined,
      },
    ];
  });
  const normalizedProviders = providers.length
    ? providers
    : DEFAULT_AI_ADVISOR_SETTINGS.providers.map((provider) => ({ ...provider }));
  const activeProviderId = normalizedProviders.some(
    (provider) => provider.id === raw.activeProviderId && provider.enabled,
  )
    ? raw.activeProviderId!
    : (normalizedProviders.find((provider) => provider.enabled)?.id ?? normalizedProviders[0].id);
  return { providers: normalizedProviders, activeProviderId };
}

export function aiProviderById(
  id: AiProviderId,
  providers: AiProvider[] = AI_PROVIDERS,
): AiProvider {
  return providers.find((provider) => provider.id === id) ?? providers[0] ?? AI_PROVIDERS[0];
}
