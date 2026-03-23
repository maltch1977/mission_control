# OpenClaw Control Tower

Last updated: 2026-03-23 (UTC)
Owner: Chad
Maintainer: Panda

## How to use this page
- This is the single high-level dashboard for current work.
- Check `Now`, `Waiting on Chad`, and `Next 24h` first.
- For concept topics, open `IDEA_INBOX.md` (capture) and `IDEAS_BACKLOG.md` (tracked).
- Status labels:
  - [ ] Not started
  - [~] In progress
  - [x] Complete
  - [!] Blocked

---

## Now

### OpenClaw worker platform (`openclaw-workers`)
- [x] Repo scaffold created
- [x] 7-worker pipeline in place (including visual-production-planner)
- [x] Worker contracts and schemas added
- [x] Pipeline simulation added
- [x] Command parser layer added
- [x] Playbooks and templates added
- [~] Integration hardening and runbook polish
- [ ] Merge to main after review

### Social execution system
- [x] Karina paired for Telegram DM
- [x] Brand direction set: long-term broad small-business framing
- [x] Founder presence planning added to pipeline
- [~] Stabilize daily command workflow for Karina

### Notion
- [x] Kepter Marketing HQ page created
- [x] Content calendar and supporting pages created
- [~] Keep as lightweight execution tracker only

---

## Waiting on Chad
- [ ] Confirm merge path for `openclaw-workers` (`feat/worker-pipeline-v1` -> `main`)
- [ ] Confirm tomorrow's first priority in Kepter app polish
- [ ] Choose first reliability fix to execute now: qmd repair, gateway allowlist cleanup, or full skill hygiene pass (`canvas` frontmatter + `skill-creator` dead refs)
- [ ] Decide whether Slack scope cleanup is needed now or deferred (current behavior recovers but warns `missing_scope`)
- [ ] Decide if subscription tracker should be Google Sheet or Notion table

---

## Next 24h plan

### A) Kepter app release polish
- [ ] Run P0 release readiness audit
- [ ] Create blocker-only fix list
- [ ] Lock v1 release checklist

### B) Worker platform
- [ ] Add QA auto-revision loop behavior docs and tests
- [ ] Add operator runbook for overnight automation
- [ ] Add Telegram command cheat sheet for Karina

### C) Finance hygiene
- [ ] Create simple subscription tracker
- [ ] Fill current recurring tools and renewal dates
- [ ] Mark cancel candidates

---

## Key decisions locked
- Primary model for chat is Codex
- Kimi can be used for heavy parallel build tasks
- Social execution should run in Karina's Telegram DM
- Long-term brand copy is broad (small businesses), campaign wedge is bars and restaurants
- No em dashes in assistant responses or generated copy

---

## Open risks
- Slack social routing behavior was inconsistent in prior setup
- Notion can become overhead if over-managed
- Memory search via qmd had module-path failures and needs repair (now recurring during live gateway updates, not just historical)
- Gateway coding allowlist has unknown entries and generates repetitive warning noise
- Skill quality drift detected (`canvas` missing frontmatter, `model-usage` contains Linux TODO + frontmatter spec drift)
- `skill-creator` maintenance drift: validator rejects real skill keys (`homepage`), stale `utils/` path references, and symlink policy mismatch (docs say fail, script skips)
- Skill schema-doc drift: current production skills use extra frontmatter fields while `skill-creator` guidance implies strict `name` + `description`
- Minor skill script hygiene issue: two script files have shebangs but are not executable (`openai-whisper-api/scripts/transcribe.sh`, `video-frames/scripts/frame.sh`)

---

## Parking lot
- AI click-testing system for app flows (deferred until after release polish)
- Full custom dashboard UI beyond Notion (after core pipeline is stable)
pts/frame.sh`)

---

## Parking lot
- AI click-testing system for app flows (deferred until after release polish)
- Full custom dashboard UI beyond Notion (after core pipeline is stable)
