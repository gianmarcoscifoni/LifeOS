'use client';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';

interface Stat { name: string; value: number }
interface StatsRadarProps { stats: Stat[] }

export function StatsRadar({ stats }: StatsRadarProps) {
  const data = stats.map(s => ({
    subject: s.name.charAt(0).toUpperCase() + s.name.slice(1),
    value: s.value,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'rgba(226,232,240,0.55)', fontSize: 11 }}
        />
        <Radar
          name="Stats"
          dataKey="value"
          stroke="#C9A84C"
          fill="#3B0D7A"
          fillOpacity={0.55}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
