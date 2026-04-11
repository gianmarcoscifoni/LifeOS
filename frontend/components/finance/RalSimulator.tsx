'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SimulateResult {
  targetRal: number;
  monthlyGross: number;
  monthlyNet: number;
  gapFromCurrent: number;
  yearsToTarget: number;
}

export function RalSimulator({ currentRal, targetRal }: { currentRal: number; targetRal: number }) {
  const [ral, setRal] = useState(targetRal);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/proxy/finance/simulate?target_ral=${ral}`);
        if (res.ok) setResult(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [ral]);

  const pct = Math.min(100, Math.round(((ral - currentRal) / (200000 - currentRal)) * 100));

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'rgba(226,232,240,0.6)' }}>Target RAL</span>
          <span
            className="text-lg font-black"
            style={{ color: '#C9A84C', textShadow: '0 0 10px rgba(201,168,76,0.4)' }}
          >
            €{ral.toLocaleString()}
          </span>
        </div>

        {/* Custom slider */}
        <input
          type="range"
          min={currentRal}
          max={200000}
          step={1000}
          value={ral}
          onChange={e => setRal(Number(e.target.value))}
          className="w-full h-2 rounded-full cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(90deg, #9333EA ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
            accentColor: '#C9A84C',
          }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(226,232,240,0.3)' }}>
          <span>€{currentRal.toLocaleString()} (now)</span>
          <span>€200K</span>
        </div>
      </div>

      {loading && (
        <p className="text-xs" style={{ color: 'rgba(226,232,240,0.4)' }}>Calculating...</p>
      )}

      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { label: 'Monthly Net',    value: `€${result.monthlyNet.toLocaleString()}`,    color: '#34D399' },
            { label: 'Gap from now',   value: `€${result.gapFromCurrent.toLocaleString()}`, color: '#C9A84C' },
            { label: 'Monthly Gross',  value: `€${result.monthlyGross.toLocaleString()}`,  color: '#E2E8F0' },
            { label: 'Years to reach', value: `${result.yearsToTarget.toFixed(1)}y`,        color: '#C084FC' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px]" style={{ color: 'rgba(226,232,240,0.4)' }}>{card.label}</p>
              <p className="text-base font-black mt-0.5" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
