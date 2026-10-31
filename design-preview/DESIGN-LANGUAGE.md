# Black/orange design language and integration handoff

## Start here

This package includes **working application changes**, not only design mockups.
Do not rebuild the cinematic Home or reapply the shared theme from scratch.
The owner requested a pull request for review, **not an automatic merge or deployment**.

| Resource | Purpose |
| --- | --- |
| [Original HTML collection](studio.html) | Approved interactive design references for 17 page families |
| [Cinematic Home reference](home.html) | Original tilted-board concept selected for the real homepage |
| [Live-screen comparisons](live-comparison/index.html) | Portable, checked-in screenshots of 33 real screens/states; 66 desktop/mobile pairs |
| [Comparison manifest](live-comparison/results.json) | Capture names, languages, viewport variants and recorded checks |
| [Shared live theme](../public/ui-theme.css) | Authoritative tokens and scoped overrides for existing pages |
| [Home styles](../public/home-page.css) | Cinematic layout and responsive rules |
| [Home component](../src/home-page.ts) | Real homepage, illustrative move comparison and tool links |
| [Application wiring](../src/main.ts) | Session-aware landing, official-board factory and existing destinations |
| [Root handoff](../README.md) | Full preview inventory, limitations and deferred work |

Open the HTML collection and comparison gallery locally after cloning the whole
repository. Keep each gallery with its sibling assets. The comparison gallery is
an image-based review, not 33 independently functional HTML applications.
Its Home columns both show the new cinematic layout with the shared theme off/on;
they do **not** show the removed welcome card. Daily Streak is intentionally unchanged.

The live app is built separately. `design-preview/` is not copied into the
production output by the current build. Do not copy demo fixtures or screenshots
into live routes or ship test-account endpoints.

## Visual language

Use the existing CSS variables instead of introducing another palette or theme
framework. The preview styles are visual references; the live styles are the
implementation source of truth.

| Role | Live token/value |
| --- | --- |
| Background | `--canvas-parchment: #080706` |
| Main panel | `--canvas: #11100f` |
| Raised surface | `--surface-pearl: #1a1713` |
| Main text | `--ink: #f4f0e9` |
| Muted text | `--body-muted: #b0a79b` |
| Border | `--hairline: #40362b` |
| Primary action | `--primary: #ed882d` |
| Focus/highlight | `--primary-focus: #ffad66` |
| Text on orange | `--on-primary: #211006` |
| Cinematic Home accent | `--ch-accent: #e67e22` |

- Use near-black backgrounds, warm layered surfaces, restrained orange emphasis,
  thin warm borders and generous spacing. Keep large headings and clear action hierarchy.
- Retain existing typography and component conventions; do not add remote fonts,
  a UI framework, dependencies or a second design system just for this theme.
- Keep status semantics: wins/losses, errors, low time and move classifications
  must remain distinguishable. The evaluation bar stays white/black.
- Keep the official `cm-chessboard` standard pieces and existing licensing/attribution.
  Never apply a decorative tilt to a board used for playing, reviewing or training.
- Home may use the tilted decorative board and restrained scroll-driven rotation.
  Its Bc4/d4 example stays flat and explicitly illustrative, with no engine rating
  or invented personal statistics. Preserve manual and system reduced motion.
- Preserve Hebrew/RTL and English/LTR, visible keyboard focus, reachable controls,
  mobile layouts and no horizontal overflow. Existing untranslated legacy text
  is not proof of completed localization.
- Keep the existing coach image. New avatars, coach reactions and the rejected
  3D knight are not part of this implementation.

## Protected behavior

**Do not restyle the dedicated Daily Streak screen.** Shared overrides use
`:root:not(:has(.daily-rhythm))` and `html:not(:has(.daily-rhythm))` so even its
inherited tokens remain unchanged. Home uses its own `ch-*` classes. Preserve this
isolation when adding selectors; test navigation into and out of Daily Streak.
The small streak card inside Puzzles is a separate surface and does follow the theme.

Preserve account/API contracts, auth setup guards, human/private-site gates,
signup approval, email verification, consent, chess rules, engine behavior,
progress, puzzle modes, clock behavior, audio and volume controls.
Do not change database schemas or activate `DAILY_STREAK_ENABLED` as part of styling.
Use existing loaders and error states; Home's DNA link must use the saved-report
loader rather than only setting a page name.

## Implementation status

- **Already implemented here:** shared black/orange styling for existing live
  layouts, static/legal pages and entry shells; responsive Openings correction;
  cinematic Home for visitors and signed-in users; real navigation; browser tests.
- **Already present on main from earlier work:** the original preview collection,
  official board assets, and the dedicated Daily Streak implementation/reference.
  Do not recreate those earlier PRs.
- **Not implied by this PR:** replacing every existing layout with every prototype
  layout, adding Help, future concepts, avatars/coach emotions, or activating live
  streak storage. Any further layout or feature integration needs an agreed scope.
- **Still required before release:** final-head CI, review of the combined changes,
  staging checks with real authenticated services and explicit owner merge approval.

## Ordered steps for the working integration agent

1. **Start from this PR branch, not a fresh implementation.** Fetch it into an
   isolated worktree. Read this document and the root handoff. Keep unrelated
   work and historical PR reconciliation separate; never force-push.
2. **Inspect the deliverables.** Open `studio.html`, the original `home.html`
   and `live-comparison/index.html`. The original collection is approved;
   use the live comparisons and functional preview to review this implementation.
3. **Run the actual candidate locally.** Run `npm ci`, `npm run build`, then
   `npm run preview:local -- --port 4185` on a free port. This server uses a fake
   account and in-memory data: it is not real signup, email, admin or cross-device
   validation. Do not reuse another developer's occupied port.
4. **Reconcile with current main without rewriting history.** Inspect changes to
   app routing, CSS, gates and workflows before resolving conflicts. Preserve newer
   product behavior. Do not change the protected Daily Streak design.
5. **Audit wiring before implementing anything further.** Confirm guests and
   returning visitors land on Home, successful sign-in lands on authenticated
   Home, guest tool links go through sign-in, and Home links open the real tools.
   Verify Archive/Home return navigation and Home -> Review/DNA behavior. Confirm
   the two CSS imports and exact gate stylesheet allowlist remain connected.
6. **Implement only identified gaps.** The remaining pages already have the new
   palette on their existing layouts. If a full prototype layout is also wanted,
   agree that page's scope first, then adapt its real component and data states.
   Never replace working routes with fixture HTML or fabricate successful data.
7. **Run the focused checks, then final CI.** Use the commands below. Inspect
   screenshots, Hebrew/English, mobile, keyboard access and reduced motion.
   Preserve the original failure assertions when updating tests. Recheck volume,
   game/engine behavior and real account boundaries on staging.
8. **Hand the PR back to the owner.** Summarize changes, actual test results and
   remaining limitations. Wait for explicit approval; **do not auto-merge**.
   After an owner-approved merge/deployment, verify real site gates, sign-in,
   homepage assets/navigation and Daily Streak again. Do not activate feature
   flags or migrations without separate authorization.

## Checks and refreshing evidence

```sh
npm run build
npm run check:gate
npm run check:product
npm install --no-save --package-lock=false playwright@1.52.0
npx playwright install chromium
npm run check:ui-theme
node scripts/check-daily-streak-browser.mjs
```

For installed Chrome instead of downloaded Chromium, add `-- --chrome` to
`npm run check:ui-theme`, and `--chrome` to the daily-streak script.
For a focused Home check:

```sh
npm run check:ui-theme -- --chrome --page=home,home-account
```

The UI suite uses port 4186; the daily-streak suite uses 4178. Both stop their own
test server. Full UI runs generate `artifacts/ui-theme/`; focused runs write its
`focused/` subdirectory without replacing the full gallery.

The checked-in `live-comparison/` is a review snapshot exported from a passing
full run on 31 October 2026, using only local fixtures. Build/type checks, gate
and product contracts, 33-screen comparisons, focused Home/auth/navigation tests
and the Daily Streak browser regression passed locally before this handoff.
This is not a claim that remote CI or production authentication has passed.

To refresh the committed snapshot, first run the full suite successfully and
inspect the result. Then deliberately replace only `live-comparison/index.html`,
`results.json` and the 132 PNGs referenced by that manifest. Do not copy the
`focused/` directory, unrelated artifacts, real account data or credentials.
Review those changes before committing; CI keeps its own fresh screenshots as
workflow artifacts and does not automatically refresh this checked-in snapshot.
