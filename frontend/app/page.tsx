import { DashboardClient } from '@/components/dashboard/DashboardClient';

interface DashboardOverview {
  brand: {
    codename: string;
    level: number;
    tier: string;
    totalXp: number;
    xpToNextLevel: number;
    currentLevelXp: number;
  };
  habits: {
    totalHabits: number;
    completedToday: number;
    longestStreak: number;
  };
  career: {
    activeGoals: number;
    totalMilestones: number;
    completedMilestones: number;
  };
  finance: {
    currentRal: number;
    targetRal: number;
    monthlySavings: number;
  };
  content: {
    queueSize: number;
    publishedThisMonth: number;
    readyToPublish: number;
  };
}

async function getDashboard(): Promise<DashboardOverview | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'lifeos-dev-key';
  try {
    const res = await fetch(`${apiUrl}/api/dashboard/overview`, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboard();
  return <DashboardClient data={data} />;
}
