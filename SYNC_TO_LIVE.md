# Sync to Live — Push Guide

## The Problem

When pushing from the Replit workspace to `origin` (MINT-LIVE on GitHub), the push was rejected with:

```
remote: fatal: did not receive expected object 8b7ff159c66cb5e518951f2876cfee1bcd6bfe1d
error: remote unpack failed: index-pack failed
! [remote rejected] main -> main (failed)
```

### Root Causes

**1. Shallow / Grafted Repository**
The Replit workspace is cloned with a shallow history (confirmed via `git rev-parse --is-shallow-repository` → `true`). The local commit `28bd4d05` is marked as `(grafted)`, meaning its real parent `8b7ff159` is cut off locally. When GitHub unpacks the push, it references that parent and can't find it in the pack — so it rejects the whole push.

**2. Stale Lock File**
An interrupted `git fetch --unshallow` attempt left behind a `.git/shallow.lock` file. This caused all subsequent `git fetch` commands to immediately fail with:

```
fatal: Unable to create '/home/runner/workspace/.git/shallow.lock': File exists.
```

This prevented the unshallow from ever completing, keeping the repo in a broken half-shallow state.

---

## The Fix (use this every time it breaks)

Run this single command from the Replit terminal:

```bash
rm -f .git/shallow.lock && git fetch dev --unshallow && git push origin main --force
```

### What each step does

| Step | Command | Why |
|------|---------|-----|
| 1 | `rm -f .git/shallow.lock` | Clears any stale lock file left by a previous interrupted fetch |
| 2 | `git fetch dev --unshallow` | Fetches the full commit history from MINT-DEVELOPMENT (`dev` remote), converting the shallow/grafted clone into a full one so all parent objects are present locally |
| 3 | `git push origin main --force` | Force-pushes the now-complete history to MINT-LIVE (`origin`) — GitHub can find all referenced objects in the pack |

---

## Remotes Reference

| Alias | URL | Purpose |
|-------|-----|---------|
| `dev` | https://github.com/tsiemasilo-dev/MINT-DEVELOPMENT.git | Development source — fetch history from here |
| `origin` | https://github.com/tsiemasilo-dev/MINT-LIVE.git | Production target — push to here |

---

## Prevention

To avoid this happening again, always sync from `dev/main` before pushing to live:

```bash
git fetch dev
git reset --hard dev/main
rm -f .git/shallow.lock && git fetch dev --unshallow && git push origin main --force
```
