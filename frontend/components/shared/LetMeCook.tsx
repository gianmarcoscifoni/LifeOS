'use client';
import { useUiStore } from '@/lib/store';

export function LetMeCook() {
  const isLoading = useUiStore((s) => s.loadingCount > 0);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-2xl border border-purple-500/30 bg-[#0A0415]/80 backdrop-blur-md shadow-[0_0_40px_rgba(147,51,234,0.25)]">
        {/* flame dots */}
        <div className="flex items-end gap-1.5 h-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block w-1.5 rounded-full bg-gradient-to-t from-purple-600 to-violet-300"
              style={{
                height: `${12 + Math.abs(2 - i) * 6}px`,
                animation: `cook-pulse 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
              }}
            />
          ))}
        </div>
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: 'var(--lifeos-glow)' }}
        >
          let me cook…
        </span>
      </div>

      <style>{`
        @keyframes cook-pulse {
          from { transform: scaleY(0.6); opacity: 0.5; }
          to   { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
