# DEPLOY.md

## Mission Control Deploy Flow (30 seconds)

### Default release path
1. Make code changes locally
2. Commit to `main`
3. Push to GitHub (`origin/main`)
4. Vercel auto-deploys production
5. Verify deployment is `Ready`

---

## Commands

```bash
cd /home/chad/.openclaw/workspace/mission-control

# check branch
git branch --show-current

# commit
git add .
git commit -m "<clear message>"

# ship
git push origin main
```

---

## Quick verification after deploy
- Open production URL
- Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)
- Test one real action (create/edit/move task)
- Refresh page and confirm persistence

---

## If deployment does not trigger
1. Confirm push reached GitHub `main`
2. In Vercel, project must be linked to this repo
3. In Vercel, `Production Branch` should be `main`
4. Trigger manual redeploy from latest successful deployment

---

## Required environment variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If either is missing, app falls back to local-only behavior or fails to sync.
