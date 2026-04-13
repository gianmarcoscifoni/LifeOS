// Voice Dialogue Engine — multi-turn structured interview scripts.
// Pure TypeScript, no React, no side effects.

import type { ConfirmItem } from './store';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DialogueContext {
  hour: number;
  dayOfWeek: number; // 0 = Sunday
  userName: string;
  habitNames: string[];
}

export interface DialogueStep {
  id: string;
  domain: string;
  buildQuestion: (collected: Record<string, unknown>, ctx: DialogueContext) => string;
  collect: string; // key to store answer in collectedData
  parse?: (answer: string) => unknown;
  // returns extra step to insert dynamically, or null
  dynamic?: (answer: string, collected: Record<string, unknown>, ctx: DialogueContext) => DialogueStep | null;
}

export interface DialogueScript {
  id: string;
  domain: string;
  greeting: (userName: string, ctx: DialogueContext) => string;
  steps: DialogueStep[];
  buildConfirmation: (collected: Record<string, unknown>, ctx: DialogueContext) => ConfirmItem[];
}

export interface AdvanceResult {
  nextStepIndex: number | 'confirm' | 'done';
  nextQuestion: string | null;
  updatedCollected: Record<string, unknown>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const AFFIRMATIVE = /^(sì|si|yes|ok|fatto|certo|esatto|confermo|perfetto|corretto|dai|va bene|l'ho fatto|ho fatto|ho completato|yes done)\b/i;
const NEGATIVE    = /^(no|nope|non|non l'ho fatto|non ci sono riuscito|non ho fatto|nah|niente)\b/i;

function parseYesNo(answer: string): boolean {
  if (AFFIRMATIVE.test(answer.trim())) return true;
  if (NEGATIVE.test(answer.trim())) return false;
  // default optimistic
  return true;
}

function parseTodos(answer: string): string[] {
  // Split on comma, "e poi", "poi", newline, semicolon
  return answer
    .split(/,|;\s*|\s+e poi\s+|\s+poi\s+|\n/)
    .map(t => t.trim())
    .filter(t => t.length > 2);
}

function parseMood(answer: string): string {
  const lower = answer.toLowerCase();
  if (/ottim|benissim|fantastico|alla grande|perfett|peak/.test(lower)) return 'peak';
  if (/bene|bello|brav|positiv|great|good/.test(lower)) return 'good';
  if (/così così|normale|regular|insomma|meh|neutral/.test(lower)) return 'neutral';
  if (/male|stanco|stress|faticoso|bad|duro/.test(lower)) return 'bad';
  if (/pessim|terribile|orribile|terrible/.test(lower)) return 'terrible';
  return 'neutral';
}

const DAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

// ── MORNING HABITS SCRIPT ──────────────────────────────────────────────────

function buildHabitSteps(habitNames: string[]): DialogueStep[] {
  return habitNames.map((name, i) => ({
    id: `habit_${i}`,
    domain: 'habits',
    buildQuestion: (_collected, _ctx) =>
      i === 0
        ? `Hai completato "${name}" ieri?`
        : `E "${name}"?`,
    collect: `habit_${name}`,
    parse: parseYesNo,
  }));
}

export const MORNING_HABITS_SCRIPT: DialogueScript = {
  id: 'morning_habits',
  domain: 'habits',
  greeting: (userName, ctx) =>
    `Ciao ${userName}! Sono le ${ctx.hour}:00. Tracciamo le abitudini di ieri?`,
  get steps() {
    // Steps are built dynamically in getScriptSteps() using context
    return [] as DialogueStep[];
  },
  buildConfirmation: (collected) => {
    return Object.entries(collected)
      .filter(([k]) => k.startsWith('habit_'))
      .map(([k, v]) => {
        const name = k.replace('habit_', '');
        const done = v as boolean;
        return {
          label: name,
          value: done ? 'completato' : 'saltato',
          icon: done ? '✅' : '❌',
          status: done ? 'ok' : 'skip',
        } satisfies ConfirmItem;
      });
  },
};

// ── TODO CREATION SCRIPT ───────────────────────────────────────────────────

export const TODO_CREATION_SCRIPT: DialogueScript = {
  id: 'todo_creation',
  domain: 'career',
  greeting: (userName) =>
    `Ciao ${userName}! Dimmi i tuoi task di oggi — uno alla volta o tutti insieme.`,
  steps: [
    {
      id: 'collect_todos',
      domain: 'career',
      buildQuestion: () => 'Dimmi i tuoi task di oggi.',
      collect: 'rawTodos',
      parse: parseTodos,
    },
    {
      id: 'add_more',
      domain: 'career',
      buildQuestion: (collected) => {
        const todos = collected['rawTodos'] as string[] | undefined;
        const list = todos?.slice(0, 3).map(t => `"${t}"`).join(', ') ?? '';
        return `Ho capito: ${list}. Aggiungi altro?`;
      },
      collect: 'addMore',
      parse: parseYesNo,
      dynamic: (answer, collected, _ctx) => {
        if (parseYesNo(answer)) {
          return {
            id: 'extra_todos',
            domain: 'career',
            buildQuestion: () => 'Dimmi gli altri task.',
            collect: 'extraTodos',
            parse: (a: string) => {
              const extra = parseTodos(a);
              const existing = (collected['rawTodos'] as string[]) ?? [];
              return [...existing, ...extra];
            },
          };
        }
        return null;
      },
    },
  ],
  buildConfirmation: (collected) => {
    const todos = (collected['rawTodos'] as string[]) ?? [];
    return todos.map(t => ({
      label: t,
      value: 'da fare',
      icon: '📋',
      status: 'ok',
    } satisfies ConfirmItem));
  },
};

// ── WEEKLY CHECKIN SCRIPT ──────────────────────────────────────────────────

export const WEEKLY_CHECKIN_SCRIPT: DialogueScript = {
  id: 'weekly_checkin',
  domain: 'journal',
  greeting: (userName, ctx) => {
    const dayName = DAY_NAMES[ctx.dayOfWeek];
    return `È ${dayName}, ${userName}. Come è andata questa settimana? Dimmi i tuoi wins principali.`;
  },
  steps: [
    {
      id: 'wins',
      domain: 'journal',
      buildQuestion: () => 'Cosa hai ottenuto di importante questa settimana?',
      collect: 'wins',
    },
    {
      id: 'improvements',
      domain: 'journal',
      buildQuestion: () => "C'è qualcosa che vorresti migliorare la settimana prossima?",
      collect: 'improvements',
    },
    {
      id: 'mood',
      domain: 'journal',
      buildQuestion: () => 'Come ti senti complessivamente? Una parola.',
      collect: 'mood',
      parse: parseMood,
    },
  ],
  buildConfirmation: (collected) => [
    { label: 'Wins', value: (collected['wins'] as string) ?? '', icon: '🏆', status: 'ok' },
    { label: 'Miglioramenti', value: (collected['improvements'] as string) ?? '', icon: '📈', status: 'ok' },
    { label: 'Umore', value: (collected['mood'] as string) ?? 'neutral', icon: '🎯', status: 'ok' },
  ],
};

// ── Script registry ────────────────────────────────────────────────────────

export const SCRIPTS: Record<string, DialogueScript> = {
  morning_habits:  MORNING_HABITS_SCRIPT,
  todo_creation:   TODO_CREATION_SCRIPT,
  weekly_checkin:  WEEKLY_CHECKIN_SCRIPT,
};

export function getScript(id: string): DialogueScript | null {
  return SCRIPTS[id] ?? null;
}

// Build the concrete steps for a script given runtime context
export function getScriptSteps(scriptId: string, ctx: DialogueContext): DialogueStep[] {
  if (scriptId === 'morning_habits') {
    return [
      ...buildHabitSteps(ctx.habitNames),
      {
        id: 'mood',
        domain: 'habits',
        buildQuestion: (collected) => {
          const done = Object.entries(collected).filter(([k, v]) => k.startsWith('habit_') && v === true).length;
          const total = ctx.habitNames.length;
          return `Perfetto, ${done} su ${total} abitudini completate. Com'è il tuo umore oggi?`;
        },
        collect: 'mood',
        parse: parseMood,
      },
    ];
  }
  return getScript(scriptId)?.steps ?? [];
}

// ── Engine: advance one turn ───────────────────────────────────────────────

export function advanceScript(
  scriptId: string,
  stepIndex: number,
  userAnswer: string,
  collected: Record<string, unknown>,
  ctx: DialogueContext,
): AdvanceResult {
  const steps = getScriptSteps(scriptId, ctx);

  if (stepIndex >= steps.length) {
    return { nextStepIndex: 'confirm', nextQuestion: null, updatedCollected: collected };
  }

  const currentStep = steps[stepIndex];
  const parsedValue = currentStep.parse ? currentStep.parse(userAnswer) : userAnswer;
  const updatedCollected = { ...collected, [currentStep.collect]: parsedValue };

  // Check for dynamic follow-up step
  const dynamicStep = currentStep.dynamic?.(userAnswer, updatedCollected, ctx);
  if (dynamicStep) {
    const dynamicQuestion = dynamicStep.buildQuestion(updatedCollected, ctx);
    // Inject dynamic step: return a special marker carrying the step
    return {
      nextStepIndex: stepIndex + 1,
      nextQuestion: dynamicQuestion,
      updatedCollected: { ...updatedCollected, __dynamic: dynamicStep },
    };
  }

  const nextIndex = stepIndex + 1;

  if (nextIndex >= steps.length) {
    return { nextStepIndex: 'confirm', nextQuestion: null, updatedCollected };
  }

  const nextStep = steps[nextIndex];
  const nextQuestion = nextStep.buildQuestion(updatedCollected, ctx);
  return { nextStepIndex: nextIndex, nextQuestion, updatedCollected };
}

// ── Proactive trigger ──────────────────────────────────────────────────────

export function shouldTriggerProactive(ctx: DialogueContext): DialogueScript | null {
  const { hour, dayOfWeek, habitNames } = ctx;
  if (habitNames.length > 0 && hour >= 7 && hour <= 11) return MORNING_HABITS_SCRIPT;
  if (dayOfWeek === 5 && hour >= 17) return WEEKLY_CHECKIN_SCRIPT;
  return null;
}

// ── Build commit payload from collected data ───────────────────────────────

export interface CommitPayload {
  transcript: string;
  habit_mentions: Array<{ name: string; completed: boolean }>;
  goal_titles: string[];
  create_journal_entry: boolean;
  mood: string | null;
}

export function buildCommitPayload(scriptId: string, collected: Record<string, unknown>, ctx: DialogueContext): CommitPayload {
  if (scriptId === 'morning_habits') {
    const habitMentions = ctx.habitNames.map(name => ({
      name,
      completed: (collected[`habit_${name}`] as boolean) ?? false,
    }));
    const summary = habitMentions.map(h => `${h.name}: ${h.completed ? '✓' : '✗'}`).join(', ');
    return {
      transcript: `Check-in mattutino ${new Date().toLocaleDateString('it-IT')}. ${summary}`,
      habit_mentions: habitMentions,
      goal_titles: [],
      create_journal_entry: true,
      mood: (collected['mood'] as string) ?? null,
    };
  }

  if (scriptId === 'todo_creation') {
    const todos = (collected['rawTodos'] as string[]) ?? [];
    return {
      transcript: `Task di oggi: ${todos.join(', ')}`,
      habit_mentions: [],
      goal_titles: todos,
      create_journal_entry: false,
      mood: null,
    };
  }

  if (scriptId === 'weekly_checkin') {
    const wins = (collected['wins'] as string) ?? '';
    const improvements = (collected['improvements'] as string) ?? '';
    return {
      transcript: `Weekly check-in. Wins: ${wins}. Miglioramenti: ${improvements}`,
      habit_mentions: [],
      goal_titles: [],
      create_journal_entry: true,
      mood: (collected['mood'] as string) ?? null,
    };
  }

  return { transcript: '', habit_mentions: [], goal_titles: [], create_journal_entry: false, mood: null };
}
