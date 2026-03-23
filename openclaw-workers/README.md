# OpenClaw Workers

Content production pipeline for Karina's workflow. Six workers that hand off structured JSON to move content from idea to published post.

## Quick Start

```bash
cd openclaw-workers

# List all workers
npm run cli -- --list

# View a worker's prompt template
npm run cli -- --worker creative-partner --prompt

# Run a worker with sample input (dry-run)
cat examples/creative-partner-input.json | npm run cli -- --worker creative-partner --run

# View JSON schemas
npm run cli -- --schema handoff
npm run cli -- --schema creative-partner-output

# See example input/output
npm run cli -- --example content-producer

# Validate one worker output file
npm run cli -- --worker creative-partner --validate --input examples/creative-partner-output.json

# Simulate full pipeline using examples
npm run pipeline

# Validate all example outputs against schemas
npm run validate:all
```

## The Pipeline

```
Karina DM
    |
    v
creative-partner  <--->  (brainstorm, brief)
    |
    v
content-producer  ----->  (write draft)
    |
    v
qa-guardrail      ----->  (review)
    | (approved)
    v
repurposing       ----->  (platform variants)
    |
    v
publishing-ops    ----->  (stage for publish)
    |
    v
weekly-feedback   ----->  (analyze results)
    |
    +------------------->  (insights back to creative)
```

## Workers

| Worker | Job | Handoff To |
|--------|-----|------------|
| `creative-partner` | Brainstorm with Karina, output brief | content-producer |
| `content-producer` | Write full draft from brief | qa-guardrail |
| `qa-guardrail` | Review, approve or reject | repurposing (approved) / content-producer (revisions) |
| `repurposing` | Create platform variants | publishing-ops |
| `publishing-ops` | Stage for publish, schedule | weekly-feedback |
| `weekly-feedback` | Analyze performance, recommend | creative-partner |

## How Karina Uses It (Telegram DM)

**Starting a new piece:**
```
Karina: "I want to write about how founders waste time on tech stacks"
Bot: [creative-partner engages, asks clarifying questions]
Karina: "I like angle #2, the personal confession one"
Bot: [outputs brief, stores it, offers to proceed]
Karina: "Go"
Bot: [hands off to content-producer, returns draft]
```

**Reviewing:**
```
Karina: "Looks good, let's ship it"
Bot: [runs qa-guardrail, then repurposing, shows variants]
Karina: "Twitter thread looks perfect, schedule for 9am"
Bot: [publishing-ops stages it, confirms]
```

**Weekly check-in:**
```
[Scheduled Monday 9am]
Bot: "Last week: 2 posts, 20k views. Top performer was the stack trap thread. 
      Insight: personal stories 2x better than advice. Recommend: more confession 
      content. Want me to brainstorm ideas?"
Karina: "Yes, focus on launch anxiety"
Bot: [creative-partner starts new cycle]
```

## Directory Structure

```
openclaw-workers/
├── README.md
├── package.json
├── src/
│   └── cli.js              # Local testing CLI
├── workers/
│   ├── creative-partner.md
│   ├── content-producer.md
│   ├── repurposing.md
│   ├── qa-guardrail.md
│   ├── publishing-ops.md
│   └── weekly-feedback.md
├── schemas/
│   ├── handoff.json        # Standard envelope
│   ├── creative-partner.json
│   ├── creative-partner-output.json
│   └── ... (input/output for each worker)
└── examples/
    ├── creative-partner-input.json
    ├── creative-partner-output.json
    └── ... (full cycle sample)
```

## Handoff Schema

All workers use a standard envelope:

```json
{
  "handoff": {
    "from": "content-producer",
    "to": "qa-guardrail",
    "timestamp": "2026-03-23T10:00:00Z",
    "pipeline_id": "abc-123"
  },
  "payload": { ...worker-specific output... },
  "context": {
    "original_request": "...",
    "karina_notes": "...",
    "priority": "normal"
  }
}
```

See `schemas/handoff.json` for the full spec.

## Local Development

The CLI runs in dry-run mode. It validates JSON and shows what would be sent to the LLM, but does not call any external APIs. This keeps testing fast and free.

To integrate with real LLMs, wrap the CLI or import the prompt templates and schemas into your orchestration layer.

## Assumptions

1. **No external API calls in this repo** - The CLI is for local testing only
2. **JSON handoffs** - Workers communicate via structured payloads, not free text
3. **Karina is the decision maker** - Workers suggest, Karina approves at key gates
4. **Telegram DM is the interface** - All interactions flow through a chat bot
5. **State is external** - This repo doesn't handle storage; handoffs include pipeline_id for tracking
