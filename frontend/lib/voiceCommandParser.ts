// Pure intent parser — zero React, zero side effects.
// Called synchronously before any API request so navigation can happen instantly.

export type CommandType =
  | 'navigate'
  | 'create_goal'
  | 'log_habit'
  | 'open_journal'
  | 'create_todo'
  | 'start_morning_check'
  | 'start_weekly_checkin'
  | 'start_todo_creation'
  | 'confirmed'
  | 'rejected'
  | 'none';

export interface ParsedCommand {
  type: CommandType;
  payload: {
    route?: string;
    domain?: string;
    goalTitle?: string;
    habitName?: string;
    confirmed?: boolean;
    rawText?: string;
  };
  confidence: number; // 0..1 — if < 0.6, fall through to Claude
}

// ── Navigation map ─────────────────────────────────────────────────────────

interface RouteIntent {
  patterns: RegExp[];
  route: string;
  domain: string;
  label: string;
}

const ROUTE_INTENT_MAP: RouteIntent[] = [
  {
    patterns: [/\b(abitudini|habits?|routine)\b/i, /\bvai (su|a|alle?) abitudini\b/i, /\bmostrami (le )?abitudini\b/i],
    route: '/habits', domain: 'habits', label: 'Habits',
  },
  {
    patterns: [/\b(finanz[ae]|soldi|spese?|budget|risparmi)\b/i, /\bvai (su|a|alla?) (finanza|finance)\b/i],
    route: '/finance', domain: 'finance', label: 'Finance',
  },
  {
    patterns: [/\b(carriera|career|obiettiv[oi]|goals?)\b/i, /\b(crea|aggiungi) (un|l')? ?(obiettivo|goal)\b/i],
    route: '/career', domain: 'career', label: 'Career',
  },
  {
    patterns: [/\b(journal|diario|scriv[ia]|scrivi nel)\b/i],
    route: '/journal', domain: 'journal', label: 'Journal',
  },
  {
    patterns: [/\b(brand|rpg|skill|carattere|personaggio)\b/i],
    route: '/brand', domain: 'brand', label: 'Brand RPG',
  },
  {
    patterns: [/\b(gratitudin[ei]|gratitudine|sono grato)\b/i],
    route: '/gratitude', domain: 'gratitude', label: 'Gratitude',
  },
  {
    patterns: [/\b(content|contenut[io]|post|idee)\b/i],
    route: '/content', domain: 'content', label: 'Content',
  },
  {
    patterns: [/\b(livelli?|xp|experience|punti)\b/i],
    route: '/levels', domain: 'general', label: 'Levels',
  },
  {
    patterns: [/\b(claude|chiedi|domand[ae]|chat)\b/i],
    route: '/claude', domain: 'general', label: 'Claude',
  },
  {
    patterns: [/\b(dashboard|home|inizio|panoramica)\b/i],
    route: '/', domain: 'general', label: 'Dashboard',
  },
];

// ── Confirmation patterns ──────────────────────────────────────────────────

const AFFIRMATIVE = /^(sì|si|yes|ok|fatto|certo|esatto|confermo|perfetto|corretto|dai|va bene)\b/i;
const NEGATIVE    = /^(no|nope|non|sbagliato|annulla|cancella|stop)\b/i;

// ── Proactive script triggers ──────────────────────────────────────────────

const PROACTIVE_TRIGGERS: Array<{ pattern: RegExp; type: CommandType }> = [
  { pattern: /\b(buongiorno|morning check|abitudini di ieri|check.?in)\b/i, type: 'start_morning_check' },
  { pattern: /\b(todo ?list|lista (di )?cosa fare|cosa devo fare|task di oggi)\b/i, type: 'start_todo_creation' },
  { pattern: /\b(settimana|weekly|com'è andata|bilancio settimanale)\b/i, type: 'start_weekly_checkin' },
];

// ── CRUD shortcuts ─────────────────────────────────────────────────────────

const GOAL_CREATE   = /\b(crea|aggiungi|nuovo|nuova)\b.{0,20}\b(obiettivo|goal|task|todo)\b/i;
const HABIT_LOG     = /\b(segna|registra|ho fatto|completato)\b.{0,20}\b(abitudine|palestra|corsa|studio|meditaz)/i;

// ── Main parser ────────────────────────────────────────────────────────────

export function parseVoiceCommand(text: string): ParsedCommand {
  const t = text.trim();

  // 1. Confirmation / rejection (highest priority when in dialogue)
  if (AFFIRMATIVE.test(t)) {
    return { type: 'confirmed', payload: { confirmed: true, rawText: t }, confidence: 0.95 };
  }
  if (NEGATIVE.test(t)) {
    return { type: 'rejected', payload: { confirmed: false, rawText: t }, confidence: 0.95 };
  }

  // 2. Proactive script triggers
  for (const { pattern, type } of PROACTIVE_TRIGGERS) {
    if (pattern.test(t)) {
      return { type, payload: { rawText: t }, confidence: 0.85 };
    }
  }

  // 3. Navigation intents
  for (const intent of ROUTE_INTENT_MAP) {
    for (const pattern of intent.patterns) {
      if (pattern.test(t)) {
        return {
          type: 'navigate',
          payload: { route: intent.route, domain: intent.domain, rawText: t },
          confidence: 0.80,
        };
      }
    }
  }

  // 4. CRUD shortcuts
  if (GOAL_CREATE.test(t)) {
    const titleMatch = t.match(/(?:obiettivo|goal|task|todo)[:\s]+(.+)/i);
    return {
      type: 'create_goal',
      payload: { goalTitle: titleMatch?.[1]?.trim(), domain: 'career', rawText: t },
      confidence: 0.75,
    };
  }

  if (HABIT_LOG.test(t)) {
    return {
      type: 'log_habit',
      payload: { rawText: t },
      confidence: 0.70,
    };
  }

  // 5. None — fall through to Claude
  return { type: 'none', payload: { rawText: t }, confidence: 0 };
}
