# Orchestrator Spec

## Pipeline Order

1. **creative-partner** -> 2. **content-producer** -> 3. **qa-guardrail** -> 4. **repurposing** -> 5. **publishing-ops** -> 6. **weekly-feedback** -> (back to 1)

## Branch Logic

```
qa-guardrail:
  - status: approved -> repurposing
  - status: needs_revision -> content-producer (with feedback)
  - status: rejected -> creative-partner (start over)

weekly-feedback:
  - always -> creative-partner (insights feed next cycle)
```

## Handoff JSON Schema

See `schemas/handoff.json` for the standard envelope.

## Execution Modes

**Synchronous (default):**
- Karina says "go"
- Worker runs immediately
- Result returned in chat
- Next worker waits for approval

**Batch (optional):**
- Karina queues multiple pieces
- Workers run overnight
- Results delivered next morning

## Error Handling

- Invalid JSON: Return to sender with error details
- Worker timeout: Retry once, then alert Karina
- Missing required fields: Request clarification
