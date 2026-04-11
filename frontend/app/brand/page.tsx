'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CharacterCard } from '@/components/brand/CharacterCard';
import { StatsRadar } from '@/components/brand/StatsRadar';
import { SkillTreeVisual } from '@/components/brand/SkillTreeVisual';
import { AchievementBadge } from '@/components/brand/AchievementBadge';
import { XpLogForm } from '@/components/brand/XpLogForm';

const TABS = ['Stats', 'Skill Trees', 'Achievements', 'Log XP'];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

export default function BrandPage() {
  const [profile, setProfile] = useState<{
    codename: string; title: string; level: number; tier: string;
    totalXp: number; currentLevelXp: number; xpToNextLevel: number;
    stats: { name: string; value: number }[];
  } | null>(null);
  const [skillTrees, setSkillTrees] = useState<{ id: string; name: string; currentXp: number; nodes: unknown[] }[]>([]);
  const [achievements, setAchievements] = useState<{ id: string; name: string; description: string; isUnlocked: boolean; xpReward: number }[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/brand/profile').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/proxy/brand/skill-trees').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/proxy/brand/achievements').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([p, s, a]) => {
      setProfile(p);
      setSkillTrees(s ?? []);
      setAchievements(a ?? []);
    });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-black tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #C084FC 0%, #C9A84C 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 5s ease infinite',
        }}
      >
        Brand RPG
      </motion.h1>

      {profile ? (
        <CharacterCard
          codename={profile.codename}
          title={profile.title}
          level={profile.level}
          tier={profile.tier}
          totalXp={profile.totalXp}
          currentLevelXp={profile.currentLevelXp}
          xpToNextLevel={profile.xpToNextLevel}
        />
      ) : (
        <div className="glass p-6 text-center" style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}>
          <p className="text-2xl mb-2">🌙</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>Backend offline</p>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className="relative flex-1 py-2 text-xs font-semibold rounded-xl transition-colors"
            style={{ color: activeTab === i ? '#E2E8F0' : 'rgba(226,232,240,0.4)' }}
          >
            {activeTab === i && (
              <motion.div
                layoutId="brandTab"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'rgba(147,51,234,0.2)',
                  border: '1px solid rgba(147,51,234,0.3)',
                  boxShadow: '0 0 16px rgba(147,51,234,0.2)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 0 && (
          <div className="glass p-6" style={{ borderRadius: '1.25rem' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(192,132,252,0.8)' }}>
              ATTRIBUTE RADAR
            </p>
            {profile ? (
              <>
                <StatsRadar stats={profile.stats} />
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {profile.stats.map(s => (
                    <div
                      key={s.name}
                      className="text-center py-3 rounded-xl"
                      style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.15)' }}
                    >
                      <p className="text-xs capitalize mb-1" style={{ color: 'rgba(226,232,240,0.5)' }}>{s.name}</p>
                      <p
                        className="text-2xl font-black"
                        style={{ color: '#E2E8F0', textShadow: '0 0 12px rgba(147,51,234,0.5)' }}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>No data</p>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <motion.div
            className="grid md:grid-cols-2 gap-4"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {skillTrees.length === 0 ? (
              <div className="glass p-6 col-span-2 text-center" style={{ borderRadius: '1.25rem' }}>
                <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>No skill trees</p>
              </div>
            ) : skillTrees.map(tree => (
              <motion.div key={tree.id} variants={cardItem} className="glass p-5" style={{ borderRadius: '1.25rem' }}>
                <SkillTreeVisual tree={tree as Parameters<typeof SkillTreeVisual>[0]['tree']} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 2 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {achievements.length === 0 ? (
              <div className="glass p-6 col-span-4 text-center" style={{ borderRadius: '1.25rem' }}>
                <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>No achievements</p>
              </div>
            ) : achievements.map(a => (
              <AchievementBadge key={a.id} achievement={a} />
            ))}
          </div>
        )}

        {activeTab === 3 && (
          <div className="glass p-6" style={{ borderRadius: '1.25rem' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(192,132,252,0.8)' }}>
              LOG XP ACTION
            </p>
            <XpLogForm />
          </div>
        )}
      </motion.div>
    </div>
  );
}
