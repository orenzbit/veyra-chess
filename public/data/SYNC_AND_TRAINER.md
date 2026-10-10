# Cross-device sync, opening trainer, saved games

- Table `user_progress` (one JSON row per account): learned lines, completed openings, bot campaign index.
- Table `user_games`: every PGN the signed-in user loads is saved once (deduplicated by hash), max 500 per account.
- API: `/api/sync` (GET list/one game, PUT progress, POST game, DELETE game). The user id comes only from the encrypted session cookie.
- Merge rule: learned lines are never lost between devices (union, newest timestamp); bot index = highest.
- To enable: run the new section of `public/data/supabase-schema.sql` (tables `user_progress`, `user_games`) in the Supabase SQL Editor.
- An opening is "completed" when all its core lines are learned (starred lines, topped up to at least 6).
