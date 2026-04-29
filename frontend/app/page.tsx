import { DashboardClient } from '@/components/dashboard/DashboardClient';

async function getDashboard() {
  // Use internal proxy (server-side, picks up API_BASE_URL + API_SECRET_KEY)
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}`  // direct when no proxy needed
    : 'http://localhost:3000';

  // Hit backend directly from server component — no proxy hop needed
  const apiUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const apiKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || 'lifeos-dev-key';

  try {
    const res = await fetch(`${apiUrl}/api/dashboard/overview`, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const level    = raw.brand?.globalLevel ?? raw.brand?.GlobalLevel ?? raw.brand?.level ?? 1;
    const totalXp  = raw.brand?.totalXp ?? raw.brand?.TotalXp ?? 0;
    // Calculate XP within the current level (same formula as backend XpCalculatorService)
    const xpPerLevel = (l: number) => Math.floor(1000 * Math.pow(1.15, l - 1));
    let accumulated = 0;
    for (let l = 1; l < level; l++) accumulated += xpPerLevel(l);
    const currentLevelXp = Math.max(0, totalXp - accumulated);
    // Normalise to camelCase for DashboardClient
    return {
      brand: {
        codename:       raw.brand?.codename       ?? raw.brand?.Codename       ?? '—',
        level,
        tier:           raw.brand?.tier            ?? raw.brand?.Tier           ?? 'bronze',
        totalXp,
        xpToNextLevel:  raw.brand?.xpToNextLevel   ?? raw.brand?.XpToNextLevel  ?? 1000,
        currentLevelXp,
      },
      habits: {
        totalHabits:    raw.habits?.totalHabits   ?? raw.habits?.TotalHabits   ?? 0,
        completedToday: raw.habits?.completedToday ?? raw.habits?.CompletedToday ?? 0,
        longestStreak:  raw.habits?.longestStreak  ?? raw.habits?.LongestStreak  ?? 0,
      },
      career: {
        activeGoals:          raw.career?.activeGoals          ?? raw.career?.ActiveGoals          ?? 0,
        totalMilestones:      raw.career?.completedGoals       ?? raw.career?.CompletedGoals       ?? 0,
        completedMilestones:  raw.career?.completedGoals       ?? raw.career?.CompletedGoals       ?? 0,
      },
      finance: {
        currentRal:     raw.finance?.currentRal    ?? raw.finance?.CurrentRal    ?? 0,
        targetRal:      raw.finance?.targetRal     ?? raw.finance?.TargetRal     ?? 0,
        monthlySavings: raw.finance?.savings       ?? raw.finance?.Savings       ?? 0,
      },
      content: {
        queueSize:           raw.content?.ideasCount         ?? raw.content?.IdeasCount         ?? 0,
        publishedThisMonth:  raw.content?.publishedThisMonth ?? raw.content?.PublishedThisMonth ?? 0,
        readyToPublish:      raw.content?.readyCount         ?? raw.content?.ReadyCount         ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboard();
  return <DashboardClient data={data} />;
}
