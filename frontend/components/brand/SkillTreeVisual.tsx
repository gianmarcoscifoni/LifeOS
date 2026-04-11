'use client';
import { motion } from 'framer-motion';
import { Lock, Unlock, Star } from 'lucide-react';

interface SkillNode {
  id: string;
  name: string;
  xpRequired: number;
  isUnlocked: boolean;
  nodeOrder: number;
}

interface SkillTree {
  id: string;
  name: string;
  currentXp: number;
  nodes: SkillNode[];
}

export function SkillTreeVisual({ tree }: { tree: SkillTree }) {
  const sorted = [...(tree.nodes ?? [])].sort((a, b) => a.nodeOrder - b.nodeOrder);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3
          className="font-bold text-sm"
          style={{ color: '#E2E8F0', textShadow: '0 0 10px rgba(147,51,234,0.4)' }}
        >
          {tree.name}
        </h3>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
        >
          {tree.currentXp.toLocaleString()} XP
        </span>
      </div>

      <div className="relative flex flex-col gap-2 pl-3">
        {/* vertical line */}
        <div
          className="absolute left-6 top-4 bottom-4 w-px"
          style={{ background: 'linear-gradient(to bottom, rgba(147,51,234,0.4), transparent)' }}
        />

        {sorted.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 120 }}
            className="relative z-10 flex items-center gap-3 p-3 rounded-xl"
            style={
              node.isUnlocked
                ? {
                    background: 'rgba(147,51,234,0.15)',
                    border: '1px solid rgba(147,51,234,0.3)',
                    boxShadow: '0 0 12px rgba(147,51,234,0.1)',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    opacity: 0.6,
                  }
            }
          >
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={
                node.isUnlocked
                  ? { background: 'rgba(147,51,234,0.3)', color: '#C084FC' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.3)' }
              }
            >
              {node.isUnlocked ? <Unlock size={13} /> : <Lock size={13} />}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: node.isUnlocked ? '#E2E8F0' : 'rgba(226,232,240,0.4)' }}
              >
                {node.name}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(226,232,240,0.3)' }}>
                {node.xpRequired.toLocaleString()} XP
              </p>
            </div>
            {node.isUnlocked && (
              <Star
                size={12}
                style={{ color: '#C9A84C', filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.8))' }}
              />
            )}
          </motion.div>
        ))}

        {sorted.length === 0 && (
          <p className="text-xs pl-2" style={{ color: 'rgba(226,232,240,0.3)' }}>No nodes</p>
        )}
      </div>
    </div>
  );
}
