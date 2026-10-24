# אישור מחזור מלא לבוטי האגדות

תאריך: 2026-10-24

המשתמש אישר במפורש:
- לבנות ולאמת בסדר סדרתי את 12 פרופילי ה-PGN ההיסטוריים.
- להריץ לכל פרופיל שאינו Tal משחק הסמכה אחד נגד Tal, תוך החלפת צבע בין פרופילים; לא להריץ את Tal נגד עצמו.
- להריץ בדיקות איכות, לאבחן כישלונות, לשפר את הגישה ולנסות שוב עד מעבר או חסם מוכח.
- לאחר שכל בדיקות המוכנות עוברות, להריץ double round-robin מלא בין 12 הבוטים ההיסטוריים בלבד, שני משחקים לכל זוג בצבעים הפוכים. אין לכלול בטורניר בוטים סינתטיים.
- לשמור PGN נפרד לכל משחק, תוצאות, דוחות ביקורת ותמונות של הלוחות הסופיים; להכין פודיום לפי התוצאות בפועל.

הגבלה ידועה: סביבת GitHub Actions אינה יכולה להפעיל ישירות את מודל ChatGPT של השיחה הנוכחית. לא ייווצר משחק מזויף בשם ChatGPT ולא יוחלף בשקט במנוע אחר. משחקי ChatGPT ייחשבו פתוחים עד שניתן יהיה לשחק אותם אינטראקטיבית או לחבר מודל מורשה בנפרד.

האישור אינו כולל מיזוג ל-main, פריסה לפרודקשן או מחיקת ענפים.


Retry token: 6. This marker commit explicitly starts the approved full-loop workflow, including the 12-bot historical-only tournament after the quality gates pass.


Revision 5: qualification games are capped at search depth 2; the 12-bot historical tournament is capped at depth 3 and records progress every 10 plies. The audit verifies the tournament cap and individual PGN files.


Revision 6: each Tal qualifier is bounded by a 120-second hard timeout and reports its start; the 12-bot historical tournament is bounded by 330 minutes. Search depth is capped through a separate engine option so existing rating-based noise remains enabled.


Retry note: command-level timeouts and explicit per-command progress messages are now enabled; rerun the approved loop with the existing token 6 gate.


Retry note 5: the observed Marshall qualifier timed out at 90 plies. The tournament-only engine cap now disables quiescence extension and writes partial PGNs every 10 plies. Re-run token remains 6 so the approved workflow definition is reused.


Retry note 6: re-trigger after the engine's tournament-only quiescence cap and incremental PGN checkpoint changes; this run must use the latest branch head.

Retry note 7: CI exposed an invalid invariant in `scripts/check-bots.mjs`: real historical players share countries and overlapping eras (for example, several U.S. players). The checker now enforces unique regions/eras only for synthetic profiles, while still validating every historical profile's identity, runtime JSON, repertoire, and phrase archive. Re-run the approved full loop from the latest branch head.

Retry note 8: the previous run successfully built and qualified Anand and Marshall (both Tal games ended in valid draws), then hit the 60-second per-profile build timeout while generating Anderssen. Increase only the historical profile build timeout to 240 seconds; retain bounded checks and the 120-second Tal-qualifier limit. Restart the approved loop from the latest head.


Revision 9: the user's explicit scope is only the 12 PGN-backed historical-player bots. All earlier references to a 61-bot tournament are superseded. The 49 synthetic bots remain untouched and are excluded from the tournament; global manifest checks may still run as regression checks.


Retry note 10: run the current 12-bot historical-only loop after adding the source-grounded surprise-move test, bounded Stockfish diagnostics, and historical-only tournament selection. Do not include synthetic bots in the tournament. This run is authorized by the user's explicit approval.


Retry note 11: include the historical-only tactical benchmark scope in the latest full-loop run. The tournament and all historical-specific accuracy/holdout/surprise/Stockfish checks must use only the 12 PGN-backed player IDs; global structural manifest checks may still validate compatibility without modifying synthetic bots.


Retry note 12: the holdout gate now compares capture/check/late-king behavior on matched held-out positions with a documented tolerance, alongside exact historical-move overlap and phase coverage. Run this latest version across all 12 historical bots only.

## Latest verified-scope trigger (2026-10-24)

The approved full loop must run against the merged-with-main branch head after the scope cleanup. Scope remains limited to these 12 source-grounded historical profiles: anand, marshall, anderssen, fischer, karpov, kasparov, morphy, nakamura, polgarj, tal, capablanca, carlsen. Synthetic profiles remain unchanged; personal PGN exports are excluded. Do not merge until all profile, holdout, Stockfish, browser, tournament and supervisor-audit gates pass.
- Engine changes are scoped by `sourceFile`: the 12 historical profiles use the enhanced positional/quiescence search; synthetic profiles retain the legacy material-only evaluation path.
- Stockfish UCI `readyok` waits are now bounded at 10 seconds so a stalled engine records a diagnostic error instead of hanging indefinitely.
- Final approved rerun requested after adding a concurrency guard so ordinary commits cannot cancel the historical qualification loop.

Retry note 13: fixed duplicate PGN headers in `scripts/check-historical-surprise.mjs` by retaining all games per header key and matching each holdout using both the stored historical move and resulting FEN. Re-run the already approved 12-historical-bot loop from the latest branch head. [run-legends-tournament-6]

Retry note 14: remove external per-command timeouts from historical profile generation, contract checks, qualification games, and the full tournament. Do not stop a bot build solely because it exceeds an arbitrary wall-clock cap. Engine-level search safeguards remain separate. Re-run the approved 12 historical profiles from the current branch head. [run-legends-tournament-6]

Retry note 15: fix historical research section replacement to locate a profile by its stable bot ID, preserving its existing display heading. The prior run completed profile generation and Tal qualification for the first nine non-Tal profiles, then failed on Tal's research-section name mismatch. Resume the approved 12-bot full loop from the latest branch head. [run-legends-tournament-7]
