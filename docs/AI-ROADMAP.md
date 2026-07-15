# WorldNotion AI roadmap

## Decision

WorldNotion will expose one **Chat AI** area with two clearly separated modes and
different permissions:

1. **Advisor**: a provider webview or API chat with no vault access. The user can
   consult ChatGPT, Claude, DeepSeek, and other providers in their own environments,
   but WorldNotion does not send Markdown files or invoke local file commands.
2. **Orchestrator**: an API-backed workflow that may read explicitly authorized
   vault content and, in a later phase, propose or apply Markdown changes through a
   review flow with Git or another compatible service. This layer is intentionally
   out of scope for the current implementation.

## Chat AI architecture direction

- Use provider adapters so OpenAI, Anthropic, and future providers share one
  WorldNotion provider selector.
- Treat the local Markdown vault and Everend Spec metadata as the source of truth.
- Persist local chat metadata separately from canon; never treat a provider chat as
  an authoritative universe document.

### Security modes

| Mode | Provider access | Vault access | Intended behavior |
| --- | --- | --- | --- |
| Advisor webview | Official provider website | None from WorldNotion | The user chats in the provider's own environment. Any data the user types, pastes, or uploads is governed by that provider. |
| Advisor API | Provider API | Denied by default | WorldNotion sends only the user's prompt and app-owned UI state, never vault content or file tools. |
| Orchestrator API | Provider API | Explicitly scoped | The user authorizes selected files or a vault scope. Read access comes first; writes require a diff, confirmation, and version-control record. |

The advisor webview must be a separate Tauri webview/window with its own label and
no filesystem, dialog, opener, or application-command capability. Do not grant a
remote provider origin access to WorldNotion commands. This is feasible in Tauri,
but a remote webview is not a privacy boundary against the provider itself: the
provider still receives whatever the user submits there.

For the strongest possible guarantee, the orchestrator must eventually support a
local model option. A cloud API orchestrator necessarily exposes the authorized
Markdown content to that API while it is processing the request.

## Provider and account boundary

The advisor webview may use the user's existing consumer account. The integrated
assistant should use provider APIs, not attempt to reuse a consumer subscription as
API credit. A ChatGPT subscription and OpenAI API billing are separate, and Claude
paid plans and the Claude Console/API are also separate. Therefore the integrated
assistant should support either:

- **Bring your own key** for a local desktop installation; or
- **A WorldNotion backend** that stores provider credentials server-side and
  applies authentication, quotas, and billing for a hosted product.

The initial design should leave room for both options without coupling the UI to a
single provider.
