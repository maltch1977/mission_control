# MEMORY.md - Long-Term Memory

## Model Routing Preferences (updated 2026-03-22)

Chad wants intelligent model routing with predictable costs:

### Rules
- **Primary chat model:** `openai-codex/gpt-5.3-codex` (Codex)
- **Cheap execution model:** `moonshot/kimi-k2.5` (Kimi)
- **Premium reasoning models (optional):** `anthropic/claude-sonnet-4-6` (Sonnet), `anthropic/claude-opus-4-6` (Opus)
- **Always announce** the model actually in use at task start

### Labeling
- 🧠 **Codex** when using `openai-codex/gpt-5.3-codex`
- ⚡ **Kimi** when using `moonshot/kimi-k2.5`
- 🧠 **Sonnet** when using `anthropic/claude-sonnet-4-6`
- 🧠 **Opus** when using `anthropic/claude-opus-4-6`

### Routing strategy
- Use Codex for primary conversations and day-to-day work
- Use Kimi for grunt work, repetitive tasks, and cost-efficient execution
- Escalate to Sonnet/Opus only when explicitly needed for high-stakes reasoning

### Opus escalation rule
- If a task is genuinely complex/ambiguous/high-risk, ask Chad before escalating
- Never silently switch models
- Never hardcode "Sonnet" labels when another model is active

## Product + Workflow Context

- Chad is building the Kepter ecosystem (sports app, mobile app, site app, backend/admin stack).
- Launch support includes content guidance and social campaign execution.
- Karina handles day-to-day social workflow directly with Panda in Telegram 1:1.
- Messaging direction is broad SMB/business-owner positioning long-term; bars/restaurants is the initial GTM wedge, not the permanent positioning.
- Chad commonly uses Wispr voice dictation with Telegram, so concise voice-friendly outputs are useful.

## Writing Rule (set 2026-03-23)

- Never use em dashes in any assistant reply or generated copy.

## Operational Lessons (from 2026-03-22)

- Anthropic API can hit 30k TPM during long sessions; keep Kimi routing available for automatic fallback and cost control.
- Main chat model is now Codex (`openai-codex/gpt-5.3-codex`) after OAuth onboarding; do not revert memory defaults to Sonnet.
- Agent model routing can appear sticky across long sessions; verify actual runtime model before assuming a switch succeeded.
- `memory_search` with QMD had recurring missing module-path failures (`.../qmd/dist/cli/qmd.js`); treat memory retrieval as partially unreliable until fixed.
- Notion API cannot fully auto-create filtered linked database views; expect manual filter setup for dashboard variants.
- Do not store live secrets in memory files (tokens, API keys, pairing codes); redact immediately if pasted.

## Group Chat Rules (set 2026-03-21, updated 2026-03-22)

- **"Social Media" Telegram group** (`-5080274188`) is the default shared thread for social media topics.
- **Telegram group chats** require tag trigger (`@panda123321_bot`) before responding.
- Direct Telegram DMs are allowed for focused 1:1 social execution (Karina and client-specific bot DMs).
- Only redirect when Chad explicitly wants social discussion moved back into the shared Social Media group.

## Telegram Client Separation Pattern (set 2026-03-23)

- Telegram supports only one DM thread per bot-user pair.
- For clean per-client separation without tagging, use one Telegram bot per client and keep work in each bot DM.
- Example naming convention: `panda_<client>_bot`.
- If a bot token is ever pasted in chat, rotate it after setup.
