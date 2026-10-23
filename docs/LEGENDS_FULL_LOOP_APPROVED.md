# אישור מחזור מלא לבוטי האגדות

תאריך: 2026-10-24

המשתמש אישר במפורש:
- לבנות ולאמת בסדר סדרתי את 12 פרופילי ה-PGN ההיסטוריים.
- להריץ לכל פרופיל שאינו Tal משחק הסמכה אחד נגד Tal, תוך החלפת צבע בין פרופילים; לא להריץ את Tal נגד עצמו.
- להריץ בדיקות איכות, לאבחן כישלונות, לשפר את הגישה ולנסות שוב עד מעבר או חסם מוכח.
- לאחר שכל בדיקות המוכנות עוברות, להריץ double round-robin מלא בין כל 61 הבוטים במניפסט, שני משחקים לכל זוג בצבעים הפוכים.
- לשמור PGN נפרד לכל משחק, תוצאות, דוחות ביקורת ותמונות של הלוחות הסופיים; להכין פודיום לפי התוצאות בפועל.

הגבלה ידועה: סביבת GitHub Actions אינה יכולה להפעיל ישירות את מודל ChatGPT של השיחה הנוכחית. לא ייווצר משחק מזויף בשם ChatGPT ולא יוחלף בשקט במנוע אחר. משחקי ChatGPT ייחשבו פתוחים עד שניתן יהיה לשחק אותם אינטראקטיבית או לחבר מודל מורשה בנפרד.

האישור אינו כולל מיזוג ל-main, פריסה לפרודקשן או מחיקת ענפים.


Retry token: 6. This marker commit explicitly starts the approved full-loop workflow, including the full 61-bot tournament after the quality gates pass.


Revision 5: qualification games are capped at search depth 2; the full 61-bot tournament is capped at depth 3 and records progress every 10 plies. The audit verifies the tournament cap and individual PGN files.


Revision 6: each Tal qualifier is bounded by a 120-second hard timeout and reports its start; the full 61-bot tournament is bounded by 330 minutes. Search depth is capped through a separate engine option so existing rating-based noise remains enabled.


Retry note: command-level timeouts and explicit per-command progress messages are now enabled; rerun the approved loop with the existing token 6 gate.


Retry note 5: the observed Marshall qualifier timed out at 90 plies. The tournament-only engine cap now disables quiescence extension and writes partial PGNs every 10 plies. Re-run token remains 6 so the approved workflow definition is reused.


Retry note 6: re-trigger after the engine's tournament-only quiescence cap and incremental PGN checkpoint changes; this run must use the latest branch head.
