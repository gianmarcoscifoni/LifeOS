'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { RalSimulator } from '@/components/finance/RalSimulator';

interface FinanceSummary {
  currentRal: number;
  targetRal: number;
  monthlyExpenses: number;
  monthlySavings: number;
  netWorth: number;
  incomeStreams: { name: string; type: string; monthlyAmount: number; isActive: boolean }[];
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

export default function FinancePage() {
  const [data, setData] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    fetch('/api/proxy/finance/summary')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-black tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #C9A84C 0%, #E2E8F0 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Finance
      </motion.h1>

      {!data ? (
        <div className="glass text-center py-14" style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}>
          <p className="text-3xl mb-2">🌙</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>Backend offline</p>
        </div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: 'Current RAL', value: `€${data.currentRal.toLocaleString()}`, accent: 'rgba(226,232,240,0.7)' },
              { label: 'Target RAL',  value: `€${data.targetRal.toLocaleString()}`,  accent: '#C9A84C', glow: true },
              { label: 'Monthly Savings', value: `€${data.monthlySavings.toLocaleString()}`, accent: 'rgba(52,211,153,0.9)' },
              { label: 'Net Worth',   value: `€${data.netWorth.toLocaleString()}`,   accent: '#C084FC' },
            ].map(card => (
              <motion.div
                key={card.label}
                variants={item}
                className="glass p-4 space-y-1"
                style={{
                  borderRadius: '1.25rem',
                  ...(card.glow ? {
                    border: '1px solid rgba(201,168,76,0.3)',
                    animation: 'goldPulse 2.5s ease-in-out infinite',
                  } : {}),
                }}
                whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400 } }}
              >
                <p className="text-xs" style={{ color: 'rgba(226,232,240,0.45)' }}>{card.label}</p>
                <p
                  className="text-2xl font-black"
                  style={{ color: card.accent, textShadow: card.glow ? '0 0 14px rgba(201,168,76,0.4)' : 'none' }}
                >
                  {card.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {data.incomeStreams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass p-5"
              style={{ borderRadius: '1.25rem' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} style={{ color: '#C9A84C' }} />
                <p className="text-xs font-semibold" style={{ color: 'rgba(201,168,76,0.8)' }}>
                  INCOME STREAMS
                </p>
              </div>
              <div className="space-y-2">
                {data.incomeStreams.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>{s.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'rgba(226,232,240,0.4)' }}>{s.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>
                          €{s.monthlyAmount.toLocaleString()}/mo
                        </p>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={s.isActive ? {
                            background: 'rgba(52,211,153,0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(52,211,153,0.25)',
                          } : {
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(226,232,240,0.35)',
                          }}
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {i < data.incomeStreams.length - 1 && (
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass p-5"
            style={{ borderRadius: '1.25rem' }}
          >
            <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(201,168,76,0.8)' }}>
              RAL SIMULATOR
            </p>
            <RalSimulator currentRal={data.currentRal} targetRal={data.targetRal} />
          </motion.div>
        </>
      )}
    </div>
  );
}
