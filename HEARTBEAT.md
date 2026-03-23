# HEARTBEAT.md

## Every 60 minutes

### Review & Improve
- Review recent mistakes, issues, or friction points from the last session
- Identify anything that could be improved (config, workflow, memory, skills)
- Spawn multiple sub-agents in parallel to investigate and implement fixes
- Update `DASHBOARD.md` (Activity Log + Panda Needs From Chad)
- Update `CONTROL_TOWER.md` with current status, blockers, and next actions
- Review `IDEA_INBOX.md`, promote items into `IDEAS_BACKLOG.md`, and keep statuses current
- Ask Chad focused follow-up questions on the top unresolved ideas (one at a time, high leverage first)
- Report back with what was found and what was done

### How to run parallel sub-agents
When doing the review, spawn sub-agents concurrently — don't wait for one to finish before starting the next. Each sub-agent should tackle a specific area:
- Sub-agent 1: Check gateway logs for errors or warnings
- Sub-agent 2: Review memory files for anything worth updating or cleaning up
- Sub-agent 3: Check if any skills need attention or updates

Only report back if something was found or fixed. If everything looks clean, reply HEARTBEAT_OK.
