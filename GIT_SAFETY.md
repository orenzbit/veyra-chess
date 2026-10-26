# Git Safety — Force Push Forbidden

## Rule (absolute)

**Never force-push to any branch of `orenzbit/veyra-chess`.**

Forbidden:
- `git push --force`
- `git push -f`
- `git push --force-with-lease` (and variants)
- Any tool or UI action that rewrites remote branch history

Applies to: `main`, all feature branches, all agents (OpenCode, Copilot, GPT, Claude, Grok, etc.), and human contributors.

## Why this exists

1. **Shared history** — Other people and agents may have already pulled the branch. Force-push deletes their commits from the remote view.
2. **Broken PRs and CI** — Open pull requests and GitHub Actions runs point at SHAs that disappear after a force-push.
3. **Main is sacred** — Force-push on `main` can erase documentation, status, and production-relevant history. This repository already suffered a destructive README truncation; rewriting history would make recovery harder.
4. **Agents make mistakes** — AI agents must not have a path that silently destroys remote history. Refusal is safer than asking for confirmation under pressure.

## What to do instead

| Situation | Allowed action |
|-----------|----------------|
| Bad commit already on remote | `git revert <sha>` then normal push, or a new fixing commit |
| Wrong file content | New commit that restores/fixes the file |
| Need clean history for a PR not yet reviewed | Prefer new commits; only rewrite **local** history that was never pushed |
| User asks for force-push | Refuse, cite this file, offer revert / fix commit / PR |

## Agent response when asked to force-push

> אסור לי לבצע force push על אף ענף בפרויקט הזה (ראה `GIT_SAFETY.md` ו-`.github/copilot-instructions.md`).
> Force push מוחק היסטוריה משותפת, שובר PR ו-CI, ומסוכן במיוחד על `main`.
> במקום זה: `git revert`, commit מתקן, או PR רגיל.

## Related files

- `.github/copilot-instructions.md`
- `.opencode/agents/coder-guard.md`
- `.opencode/agents/commit-reviewer.md`
- `.opencode/agents/security-audit.md`
- `FRAMEWORK_GUIDELINES.md`
