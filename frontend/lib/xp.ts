// ─── XP Formula ────────────────────────────────────────────────────────────────
// xp_to_next = FLOOR(1000 * POW(1.15, level - 1))
// Total XP for level N = SUM(xp_to_next for levels 1..N-1)

export function xpToNextLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNextLevel(l);
  return total;
}

export function levelFromTotalXp(totalXp: number): { level: number; currentLevelXp: number; xpToNext: number } {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpToNextLevel(level);
    if (accumulated + needed > totalXp) {
      return { level, currentLevelXp: totalXp - accumulated, xpToNext: needed };
    }
    accumulated += needed;
    level++;
    if (level > 100) return { level: 100, currentLevelXp: 0, xpToNext: 1 };
  }
}

// ─── Tier System ───────────────────────────────────────────────────────────────
export interface Tier {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  glow: string;
  bg: string;
  border: string;
  description: string;
  motto: string;
  percentile: string;
}

export const TIERS: Tier[] = [
  {
    id: 'initiate',
    name: 'INITIATE',
    minLevel: 1, maxLevel: 5,
    color: '#94A3B8', glow: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
    description: 'The path begins. Every master was once a beginner.',
    motto: 'Show up.',
    percentile: 'All',
  },
  {
    id: 'novice',
    name: 'NOVICE',
    minLevel: 6, maxLevel: 15,
    color: '#67E8F9', glow: 'rgba(103,232,249,0.4)', bg: 'rgba(103,232,249,0.08)', border: 'rgba(103,232,249,0.2)',
    description: 'Patterns are forming. Habits are taking root.',
    motto: 'Build the streak.',
    percentile: 'Top 80%',
  },
  {
    id: 'apprentice',
    name: 'APPRENTICE',
    minLevel: 16, maxLevel: 30,
    color: '#86EFAC', glow: 'rgba(134,239,172,0.4)', bg: 'rgba(134,239,172,0.08)', border: 'rgba(134,239,172,0.2)',
    description: 'Discipline is compounding. You show up when others don\'t.',
    motto: 'Consistency over intensity.',
    percentile: 'Top 60%',
  },
  {
    id: 'practitioner',
    name: 'PRACTITIONER',
    minLevel: 31, maxLevel: 45,
    color: '#FCD34D', glow: 'rgba(252,211,77,0.4)', bg: 'rgba(252,211,77,0.08)', border: 'rgba(252,211,77,0.2)',
    description: 'You operate with intention. Others notice the shift.',
    motto: 'Systems over motivation.',
    percentile: 'Top 40%',
  },
  {
    id: 'adept',
    name: 'ADEPT',
    minLevel: 46, maxLevel: 60,
    color: '#FB923C', glow: 'rgba(251,146,60,0.45)', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.22)',
    description: 'Deep focus is your natural state. Output is high, cortisol is low.',
    motto: 'Depth over breadth.',
    percentile: 'Top 25%',
  },
  {
    id: 'expert',
    name: 'EXPERT',
    minLevel: 61, maxLevel: 75,
    color: '#C9A84C', glow: 'rgba(201,168,76,0.5)', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.3)',
    description: 'Mastery is visible. Your discipline is your brand.',
    motto: 'Teach what you know.',
    percentile: 'Top 15%',
  },
  {
    id: 'master',
    name: 'MASTER',
    minLevel: 76, maxLevel: 88,
    color: '#F0C96E', glow: 'rgba(240,201,110,0.55)', bg: 'rgba(240,201,110,0.1)', border: 'rgba(240,201,110,0.35)',
    description: 'Rare focus, rare output, rare life. The compound effect is undeniable.',
    motto: 'The 1% understands compound.',
    percentile: 'Top 5%',
  },
  {
    id: 'grandmaster',
    name: 'GRANDMASTER',
    minLevel: 89, maxLevel: 95,
    color: '#C084FC', glow: 'rgba(192,132,252,0.55)', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.35)',
    description: 'You operate at a frequency most people never access. Almost legendary.',
    motto: 'Flow is your default.',
    percentile: 'Top 2%',
  },
  {
    id: 'legendary',
    name: 'LEGENDARY',
    minLevel: 96, maxLevel: 99,
    color: '#E879F9', glow: 'rgba(232,121,249,0.6)', bg: 'rgba(232,121,249,0.1)', border: 'rgba(232,121,249,0.4)',
    description: 'A few hundred people worldwide. Every day is deliberate.',
    motto: 'The standard is the standard.',
    percentile: 'Top 0.5%',
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    minLevel: 100, maxLevel: 100,
    color: '#C9A84C', glow: 'rgba(201,168,76,0.9)', bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.6)',
    description: 'Top 0.1% worldwide. You have engineered your life. The aura is complete.',
    motto: 'You became the system.',
    percentile: 'Top 0.1% 🌍',
  },
];

export function tierForLevel(level: number): Tier {
  return TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) ?? TIERS[0];
}

// ─── XP Action Table ───────────────────────────────────────────────────────────
export interface XpAction {
  id: string;
  label: string;
  xp: number;
  category: 'brand' | 'health' | 'mind' | 'gratitude' | 'career' | 'finance';
  icon: string;
}

export const XP_ACTIONS: XpAction[] = [
  // Mind / Focus
  { id: 'deep_work',         label: 'Deep work session (2h)',       xp: 80,  category: 'mind',      icon: '🧠' },
  { id: 'read_book',         label: 'Read book (30 min)',           xp: 35,  category: 'mind',      icon: '📖' },
  { id: 'meditation',        label: 'Meditation / breathwork',      xp: 30,  category: 'mind',      icon: '🧘' },
  { id: 'no_social',         label: 'No social media day',          xp: 50,  category: 'mind',      icon: '🔕' },
  { id: 'learn_course',      label: 'Complete online lesson',       xp: 45,  category: 'mind',      icon: '🎓' },
  // Health / Low Cortisol
  { id: 'workout',           label: 'Workout / training',           xp: 55,  category: 'health',    icon: '💪' },
  { id: 'cold_shower',       label: 'Cold shower',                  xp: 20,  category: 'health',    icon: '🧊' },
  { id: 'sleep_8h',          label: '8h quality sleep',             xp: 40,  category: 'health',    icon: '😴' },
  { id: 'walk_nature',       label: 'Walk in nature (20 min)',      xp: 25,  category: 'health',    icon: '🌿' },
  { id: 'healthy_meals',     label: 'Clean eating day',             xp: 30,  category: 'health',    icon: '🥗' },
  // Gratitude / Mindset
  { id: 'gratitude_morning', label: 'Morning gratitude (3 things)', xp: 30,  category: 'gratitude', icon: '🙏' },
  { id: 'gratitude_journal', label: 'Full gratitude journal entry', xp: 45,  category: 'gratitude', icon: '✍️' },
  { id: 'random_kindness',   label: 'Act of kindness',             xp: 35,  category: 'gratitude', icon: '💛' },
  // Brand / Career
  { id: 'linkedin_post',     label: 'Publish LinkedIn post',        xp: 60,  category: 'brand',     icon: '💼' },
  { id: 'instagram_post',    label: 'Publish Instagram post',       xp: 40,  category: 'brand',     icon: '📸' },
  { id: 'medium_article',    label: 'Publish Medium article',       xp: 100, category: 'brand',     icon: '✍️' },
  { id: 'github_project',    label: 'Ship a GitHub project',        xp: 90,  category: 'career',    icon: '💻' },
  { id: 'networking_event',  label: 'Networking event',             xp: 50,  category: 'career',    icon: '🤝' },
  { id: 'career_goal',       label: 'Complete career goal',         xp: 150, category: 'career',    icon: '🎯' },
  // Finance
  { id: 'finance_review',    label: 'Monthly finance review',       xp: 40,  category: 'finance',   icon: '💰' },
  { id: 'financial_goal',    label: 'Reach financial milestone',    xp: 120, category: 'finance',   icon: '📈' },
  // Habit streaks
  { id: 'streak_7',          label: '7-day habit streak',           xp: 100, category: 'health',    icon: '🔥' },
  { id: 'streak_30',         label: '30-day habit streak',          xp: 400, category: 'health',    icon: '🌟' },
];
