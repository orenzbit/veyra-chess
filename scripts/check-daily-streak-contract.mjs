import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [core, api, view, client, puzzlePage, main, schema, netlify, pkg] = await Promise.all([
  read('netlify/functions/lib/daily-streak-core.mjs'),
  read('netlify/functions/daily-streak.mjs'),
  read('src/daily-streak-view.ts'),
  read('src/daily-streak-client.ts'),
  read('src/puzzle-page.ts'),
  read('src/main.ts'),
  read('public/data/supabase-schema.sql'),
  read('netlify.toml'),
  read('package.json'),
]);

// Calendar and streak semantics (1-7)
assert.match(core, /STREAK_MILESTONES = Object\.freeze\(\[7, 14, 30, 50, 100, 365\]\)/);
assert.match(core, /Intl\.DateTimeFormat/);
assert.match(core, /timeZone/);
assert.match(core, /todayQualified/);
assert.match(core, /canMaintainToday/);
assert.match(core, /status: qualified\.has\(date\) \? 'qualified' : isToday \? 'today-open' : 'missed'/);
assert.match(core, /length > 400/);

// Server trust boundaries (8-15)
assert.match(api, /currentSession/);
assert.match(api, /strictSameOrigin/);
assert.match(api, /rateLimit/);
assert.match(api, /moveSolves\(rec, move\.toLowerCase\(\)\)/);
assert.match(api, /localDateAt\(now\(\), timezoneId\)/);
assert.match(api, /source_event_id: verified\.sourceEventId/);
assert.match(api, /nextLocalDate\(nowMs, currentTz\)/);
assert.match(api, /training_transcript/);

// Account isolation and offline safety (16-20)
assert.match(client, /veyra_daily_streak_outbox_v1:' \+ userId/);
assert.match(client, /queue\.slice\(-100\)/);
assert.match(client, /credentials: 'same-origin'/);
assert.match(client, /flushDailyStreakQueue/);
assert.doesNotMatch(client, /local_date|completedAt|occurredAt/);

// UI and accessibility (21-26)
assert.match(puzzlePage, /type Tab = 'training' \| 'rush' \| 'streak' \| 'daily'/);
assert.match(puzzlePage, /daily: 'רצף יומי'/);
assert.match(puzzlePage, /recordDailyStreakActivity\(userId, \{ activityType: 'puzzle'/);
assert.match(view, /aria-label/);
assert.match(view, /daily-streak-grid/);
assert.match(view, /pendingTimezoneId/);

// Training source, schema isolation, deployment packaging, and test wiring (27-34)
assert.match(main, /activityType:'training'/);
assert.match(main, /completedLines:core\.map/);
assert.match(schema, /create table if not exists public\.user_daily_streak_settings/);
assert.match(schema, /create table if not exists public\.user_daily_streak_events/);
assert.match(schema, /unique \(user_id, source_event_id\)/);
assert.match(schema, /alter table public\.user_daily_streak_events enable row level security/);
assert.match(schema, /to service_role/);
assert.match(netlify, /public\/data\/repertoire\.json/);
assert.match(pkg, /check:daily-streak/);

console.log('Daily streak integration contract: 34 assertions passed.');
