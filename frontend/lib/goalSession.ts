export interface DailyGoalItem {
  id: string;
  title: string;
  area: string;
  priority: string;
  date: string;            // YYYY-MM-DD (day it emerged)
  completedAt: string | null;
  sessionId: string;
  dbGoalId: string | null; // populated after commit
}

export interface Top10Goal {
  id: string;
  title: string;
  area: string;
  progressPct: number;
  year: number;
  order: number;
}

const DAILY_GOALS_KEY = 'lifeos_daily_goals';
const TOP10_KEY_PREFIX = 'lifeos_top10_';

// ── Daily goals ─────────────────────────────────────────────────────────────

export function loadDailyGoals(date?: string): DailyGoalItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const all: DailyGoalItem[] = JSON.parse(localStorage.getItem(DAILY_GOALS_KEY) ?? '[]');
    if (!date) return all;
    return all.filter((g) => g.date === date);
  } catch {
    return [];
  }
}

export function saveDailyGoal(goal: DailyGoalItem): void {
  const all = loadDailyGoals();
  const exists = all.findIndex((g) => g.id === goal.id);
  const updated = exists >= 0
    ? all.map((g) => (g.id === goal.id ? goal : g))
    : [goal, ...all];
  localStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(updated.slice(0, 500)));
}

export function markGoalComplete(id: string): void {
  const all = loadDailyGoals();
  const updated = all.map((g) =>
    g.id === id ? { ...g, completedAt: new Date().toISOString() } : g
  );
  localStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(updated));
}

export function loadGoalsByPeriod(period: 'week' | 'month' | 'year'): DailyGoalItem[] {
  const all = loadDailyGoals();
  const now = new Date();
  const cutoff = new Date(now);
  if (period === 'week') cutoff.setDate(now.getDate() - 7);
  else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
  else cutoff.setFullYear(now.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return all.filter((g) => g.date >= cutoffStr);
}

// ── Top 10 goals ─────────────────────────────────────────────────────────────

export function loadTop10Goals(year: number): Top10Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`${TOP10_KEY_PREFIX}${year}`) ?? '[]');
  } catch {
    return [];
  }
}

export function saveTop10Goals(year: number, goals: Top10Goal[]): void {
  localStorage.setItem(`${TOP10_KEY_PREFIX}${year}`, JSON.stringify(goals));
}

export function addTop10Goal(year: number, title: string, area: string): Top10Goal {
  const goals = loadTop10Goals(year);
  const goal: Top10Goal = {
    id: Date.now().toString(),
    title,
    area,
    progressPct: 0,
    year,
    order: goals.length,
  };
  saveTop10Goals(year, [...goals, goal]);
  return goal;
}
