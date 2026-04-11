'use client';
import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrandStat {
  stat_name: string;
  base_value: number;
  current_value: number;
  max_value: number;
}

export interface BrandProfile {
  id: string;
  codename: string;
  global_level: number;
  total_xp: number;
  title: string;
  tier: string;
  origin_story?: string;
  mission_statement?: string;
  avatar_url?: string;
  stats: BrandStat[];
}

export interface SkillNode {
  id: string;
  name: string;
  description?: string;
  level_required: number;
  xp_reward: number;
  unlocked: boolean;
  sort_order: number;
}

export interface SkillTree {
  id: string;
  name: string;
  tree_level: number;
  tree_xp: number;
  xp_to_next: number;
  icon?: string;
  nodes: SkillNode[];
}

export interface ContentItem {
  id: string;
  platform_id: string;
  platform_name: string;
  pillar_id?: string;
  pillar_name?: string;
  tree_id?: string;
  tree_name?: string;
  title: string;
  draft?: string;
  status: string;
  scheduled_for?: string;
  published_at?: string;
  format?: string;
  xp_on_publish: number;
  created_at: string;
}

export interface Habit {
  id: string;
  domain_id: string;
  goal_id?: string;
  name: string;
  frequency: string;
  streak_current: number;
  streak_best: number;
  active: boolean;
}

// ── Brand store ────────────────────────────────────────────────────────────

interface BrandStore {
  profile: BrandProfile | null;
  skillTrees: SkillTree[];
  setProfile: (p: BrandProfile) => void;
  setSkillTrees: (trees: SkillTree[]) => void;
}

export const useBrandStore = create<BrandStore>((set) => ({
  profile: null,
  skillTrees: [],
  setProfile: (profile) => set({ profile }),
  setSkillTrees: (skillTrees) => set({ skillTrees }),
}));

// ── Content store ──────────────────────────────────────────────────────────

interface ContentStore {
  items: ContentItem[];
  setItems: (items: ContentItem[]) => void;
  updateItemStatus: (id: string, status: string) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  updateItemStatus: (id, status) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, status } : i)) })),
}));

// ── Habits store ───────────────────────────────────────────────────────────

interface HabitStore {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
}

export const useHabitStore = create<HabitStore>((set) => ({
  habits: [],
  setHabits: (habits) => set({ habits }),
}));

// ── UI store ───────────────────────────────────────────────────────────────

interface UiStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  loadingCount: number;
  startLoading: () => void;
  stopLoading: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  loadingCount: 0,
  startLoading: () => set((s) => ({ loadingCount: s.loadingCount + 1 })),
  stopLoading: () => set((s) => ({ loadingCount: Math.max(0, s.loadingCount - 1) })),
}));
