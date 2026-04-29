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

// ── XP Floater store ───────────────────────────────────────────────────────

export interface FloatReward {
  id: string;
  icon: string;
  label: string;
  color: string;
  x: number;
  domain?: string;      // e.g. "habits", "career", "content"
  isTaskDone?: boolean; // x2 XP multiplier
  xpBase?: number;      // raw XP before multiplier
  action?: string;      // human-readable action name
}

interface XpFloaterStore {
  rewards: FloatReward[];
  momentumCount: number;
  lastXpAt: number;
  triggerRewards: (rewards: FloatReward[]) => void;
  removeReward: (id: string) => void;
  incrementMomentum: () => void;
  resetMomentum: () => void;
}

const MOMENTUM_WINDOW_MS = 30_000; // 30s between XP events to sustain momentum

export const useXpFloaterStore = create<XpFloaterStore>((set, get) => ({
  rewards: [],
  momentumCount: 0,
  lastXpAt: 0,
  triggerRewards: (newRewards) =>
    set((s) => ({ rewards: [...s.rewards, ...newRewards] })),
  removeReward: (id) =>
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) })),
  incrementMomentum: () => {
    const now = Date.now();
    const { lastXpAt, momentumCount } = get();
    const sustained = now - lastXpAt < MOMENTUM_WINDOW_MS;
    set({ momentumCount: sustained ? momentumCount + 1 : 1, lastXpAt: now });
  },
  resetMomentum: () => set({ momentumCount: 0, lastXpAt: 0 }),
}));

// ── XP persistence store ───────────────────────────────────────────────────
// Tracks total XP optimistically; synced from backend on load.

interface XpStore {
  totalXp: number;
  setTotalXp: (xp: number) => void;
  addXp: (delta: number) => void;
}

export const useXpStore = create<XpStore>((set) => ({
  totalXp: 0,
  setTotalXp: (xp) => set({ totalXp: xp }),
  addXp: (delta) => set((s) => ({ totalXp: s.totalXp + delta })),
}));

// ── Voice Assistant store ──────────────────────────────────────────────────

export const DOMAIN_COLORS: Record<string, string> = {
  career:        '#9333EA',
  habits:        '#86EFAC',
  finance:       '#C9A84C',
  health:        '#F0C96E',
  brand:         '#C084FC',
  relationships: '#67E8F9',
  gratitude:     '#FCD34D',
  journal:       '#94A3B8',
  content:       '#67E8F9',
  general:       '#9333EA',
};

export type VoicePhase =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'confirming'
  | 'proactive';

export interface ConfirmItem {
  label: string;
  value: string;
  icon: string;
  status: 'ok' | 'warn' | 'skip';
}

export interface DialogueTurn {
  role: 'system' | 'user' | 'confirmation';
  text: string;
  domain?: string;
  items?: ConfirmItem[];
}

export interface ActiveDialogueScript {
  id: string;
  stepIndex: number;
  totalSteps: number;
  currentQuestion: string;
  domain: string;
  collectedData: Record<string, unknown>;
}

export interface ParticleBurst {
  count: number;
  color: string;
}

interface VoiceAssistantStore {
  isOpen: boolean;
  phase: VoicePhase;
  activeDomain: string | null;
  turns: DialogueTurn[];
  activeScript: ActiveDialogueScript | null;
  liveTranscript: string;
  particleBurst: ParticleBurst | null;
  pendingNavigation: string | null;

  openVoice: () => void;
  closeVoice: () => void;
  setPhase: (phase: VoicePhase) => void;
  setActiveDomain: (domain: string | null) => void;
  addTurn: (turn: DialogueTurn) => void;
  clearTurns: () => void;
  setLiveTranscript: (t: string) => void;
  setActiveScript: (script: ActiveDialogueScript | null) => void;
  triggerParticleBurst: (burst: ParticleBurst) => void;
  clearParticleBurst: () => void;
  setPendingNavigation: (path: string | null) => void;
}

export const useVoiceAssistantStore = create<VoiceAssistantStore>((set) => ({
  isOpen: false,
  phase: 'idle',
  activeDomain: null,
  turns: [],
  activeScript: null,
  liveTranscript: '',
  particleBurst: null,
  pendingNavigation: null,

  openVoice: () => set({ isOpen: true }),
  closeVoice: () => set({ isOpen: false, phase: 'idle', activeDomain: null, liveTranscript: '', activeScript: null, particleBurst: null, pendingNavigation: null }),
  setPhase: (phase) => set({ phase }),
  setActiveDomain: (activeDomain) => set({ activeDomain }),
  addTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
  clearTurns: () => set({ turns: [] }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setActiveScript: (activeScript) => set({ activeScript }),
  triggerParticleBurst: (particleBurst) => set({ particleBurst }),
  clearParticleBurst: () => set({ particleBurst: null }),
  setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),
}));
