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

## Writing Rule (set 2026-03-23)

- Never use em dashes in any assistant reply or generated copy.

## Group Chat Rules (set 2026-03-21)

- **"Social Media" Telegram group** (`-5080274188`) = social media topics only
- If Chad brings up social media in any other chat/DM, redirect him to the Social Media group
- Must be tagged (`@panda123321_bot`) to respond in group chats
