'use client';
import { format, subDays, parseISO, isSameDay } from 'date-fns';

interface HabitLog { loggedDate: string; completed: boolean }
interface HabitGridProps { logs: HabitLog[]; weeks?: number }

export function HabitGrid({ logs, weeks = 12 }: HabitGridProps) {
  const days = weeks * 7;
  const today = new Date();

  const cells = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const log = logs.find(l => isSameDay(parseISO(l.loggedDate), date));
    return { date, completed: log?.completed ?? false };
  });

  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
    >
      {cells.map(({ date, completed }, i) => (
        <div
          key={i}
          title={`${format(date, 'MMM d')} — ${completed ? '✓' : '✗'}`}
          className="aspect-square rounded-sm transition-all duration-200"
          style={completed ? {
            background: 'linear-gradient(135deg, #6B21A8, #9333EA)',
            boxShadow: '0 0 4px rgba(147,51,234,0.5)',
          } : {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      ))}
    </div>
  );
}
