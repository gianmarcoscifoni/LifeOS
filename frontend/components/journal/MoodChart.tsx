'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface MoodPoint { date: string; mood: number }

export function MoodChart({ data }: { data: MoodPoint[] }) {
  const chartData = data.map(d => ({
    date: format(parseISO(d.date), 'dd MMM'),
    mood: d.mood,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#9333EA" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: 'rgba(226,232,240,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'rgba(226,232,240,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [`${v}/5`, 'Mood']}
          contentStyle={{
            background: 'rgba(17,8,48,0.9)',
            border: '1px solid rgba(147,51,234,0.3)',
            borderRadius: 12,
            fontSize: 12,
            color: '#E2E8F0',
          }}
        />
        <Area
          type="monotone"
          dataKey="mood"
          stroke="#C9A84C"
          strokeWidth={2}
          fill="url(#moodGrad)"
          dot={{ r: 3, fill: '#C9A84C', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#C9A84C' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
