import type { Lang } from './i18n.js';

export type BotGroupId = 'beginner' | 'club' | 'tacticians' | 'masters' | 'legends';

export type BotGroupDef = {
  id: BotGroupId;
  name: { he: string; en: string };
  eloRange: string;
  description: { he: string; en: string };
  matches: (bot: any) => boolean;
};

export const BOT_GROUPS: readonly BotGroupDef[] = [
  {
    id: 'beginner',
    name: { he: 'צעדים ראשונים', en: 'First Steps' },
    eloRange: '100–650 Elo',
    description: {
      he: 'לשחקנים חדשים שלומדים לשמור על כלים ולזהות מטים פשוטים.',
      en: 'For new players learning to protect pieces and spot simple mates.',
    },
    matches: (bot) => (Number(bot?.elo) || 0) <= 650,
  },
  {
    id: 'club',
    name: { he: 'שחקני מועדון', en: 'Club Challengers' },
    eloRange: '700–1300 Elo',
    description: {
      he: 'למי שכבר מכיר עקרונות פתיחה ורוצה לתרגל טקטיקות בסיסיות.',
      en: 'For players who know opening basics and want to practice fundamental tactics.',
    },
    matches: (bot) => {
      const elo = Number(bot?.elo) || 0;
      return elo >= 700 && elo <= 1300;
    },
  },
  {
    id: 'tacticians',
    name: { he: 'טקטיקנים', en: 'Tacticians' },
    eloRange: '1350–1950 Elo',
    description: {
      he: 'למשחקי ביניים חדים שמענישים טעויות חומר ברורות.',
      en: 'For sharp middlegames that punish clear material mistakes.',
    },
    matches: (bot) => {
      const elo = Number(bot?.elo) || 0;
      return elo >= 1350 && elo <= 1950;
    },
  },
  {
    id: 'masters',
    name: { he: 'אמני הלוח', en: 'Board Masters' },
    eloRange: '2000–2550 Elo',
    description: {
      he: 'לאימון רציני מול סגנונות מוגדרים ורפרטואר פתיחות עמוק.',
      en: 'For serious training against distinct styles and deep opening repertoires.',
    },
    matches: (bot) => {
      const elo = Number(bot?.elo) || 0;
      return elo >= 2000 && elo <= 2550;
    },
  },
  {
    id: 'legends',
    name: { he: 'אגדות ההיסטוריה', en: 'Historical Legends' },
    eloRange: '2600–2882 Elo',
    description: {
      he: 'משחק מול 12 סגנונות ורפרטוארים היסטוריים מאתגרים במיוחד.',
      en: 'Play against 12 challenging historical styles and repertoires.',
    },
    matches: (bot) => (Number(bot?.elo) || 0) >= 2600,
  },
];

export function getBotGroup(bot: any): BotGroupDef {
  return BOT_GROUPS.find((g) => g.matches(bot)) || BOT_GROUPS[0];
}

export function groupBots(bots: any[]): { group: BotGroupDef; bots: any[] }[] {
  const list = Array.isArray(bots) ? bots : [];
  return BOT_GROUPS.map((group) => ({
    group,
    bots: list.filter((bot) => getBotGroup(bot).id === group.id),
  })).filter((entry) => entry.bots.length > 0);
}

export function botGroupLabel(group: BotGroupDef, lang: Lang): string {
  return lang === 'en' ? group.name.en : group.name.he;
}

export function botGroupDescription(group: BotGroupDef, lang: Lang): string {
  return lang === 'en' ? group.description.en : group.description.he;
}

const DEFEATED_BOTS_KEY = 'veyra_defeated_bots_v1';

// Explicitly records wins per bot slug; never inferred from legacy linear unlock index.
export function getDefeatedBots(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(DEFEATED_BOTS_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.filter((s) => typeof s === 'string' && s.trim()) : []);
  } catch {
    return new Set();
  }
}

export function recordDefeatedBot(slug: string): Set<string> {
  const current = getDefeatedBots();
  const clean = String(slug || '').trim();
  if (clean) {
    current.add(clean);
    try {
      localStorage.setItem(DEFEATED_BOTS_KEY, JSON.stringify([...current]));
    } catch {}
  }
  return current;
}
