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
  collect: string;
  parse?: (answer: string) => unknown;
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

const AFFIRMATIVE = /^(yes|yeah|yep|sure|done|correct|confirm|ok|absolutely|definitely|got it|completed|yup|affirmative|sì|si|fatto|certo|confermo|esatto|vai|perfetto)\b/i;
const NEGATIVE    = /^(no|nope|nah|not|didn't|haven't|skip|cancel|negative|non|niente)\b/i;

function parseYesNo(answer: string): boolean {
  if (AFFIRMATIVE.test(answer.trim())) return true;
  if (NEGATIVE.test(answer.trim())) return false;
  return true;
}

function parseTodos(answer: string): string[] {
  return answer
    .split(/,|;\s*|\s+and then\s+|\s+then\s+|\s+also\s+|\n/)
    .map(t => t.trim())
    .filter(t => t.length > 2);
}

function parseMood(answer: string): string {
  const lower = answer.toLowerCase();
  if (/amazing|fantastic|incredible|peak|excellent|perfect|great|awesome/.test(lower)) return 'peak';
  if (/good|well|nice|positive|solid|fine|decent/.test(lower)) return 'good';
  if (/okay|ok|alright|neutral|so.so|average|normal|meh/.test(lower)) return 'neutral';
  if (/bad|tired|stressed|rough|hard|exhausted|low/.test(lower)) return 'bad';
  if (/terrible|awful|horrible|worst/.test(lower)) return 'terrible';
  return 'neutral';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── MORNING HABITS SCRIPT ──────────────────────────────────────────────────

function buildHabitSteps(habitNames: string[]): DialogueStep[] {
  return habitNames.map((name, i) => ({
    id: `habit_${i}`,
    domain: 'habits',
    buildQuestion: (_collected, _ctx) =>
      i === 0
        ? `Did you complete "${name}" yesterday?`
        : `What about "${name}"?`,
    collect: `habit_${name}`,
    parse: parseYesNo,
  }));
}

export const MORNING_HABITS_SCRIPT: DialogueScript = {
  id: 'morning_habits',
  domain: 'habits',
  greeting: (userName, ctx) =>
    `Good morning, ${userName}. It's ${ctx.hour}:00. Ready to log yesterday's habits?`,
  get steps() { return [] as DialogueStep[]; },
  buildConfirmation: (collected) => {
    return Object.entries(collected)
      .filter(([k]) => k.startsWith('habit_'))
      .map(([k, v]) => {
        const name = k.replace('habit_', '');
        const done = v as boolean;
        return {
          label: name,
          value: done ? 'completed' : 'skipped',
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
    `Hey ${userName}, what's on your list today? Tell me your tasks — one by one or all at once.`,
  steps: [
    {
      id: 'collect_todos',
      domain: 'career',
      buildQuestion: () => "What are your tasks for today?",
      collect: 'rawTodos',
      parse: parseTodos,
    },
    {
      id: 'add_more',
      domain: 'career',
      buildQuestion: (collected) => {
        const todos = collected['rawTodos'] as string[] | undefined;
        const list  = todos?.slice(0, 3).map(t => `"${t}"`).join(', ') ?? '';
        return `Got it: ${list}. Anything else to add?`;
      },
      collect: 'addMore',
      parse: parseYesNo,
      dynamic: (answer, collected, _ctx) => {
        if (parseYesNo(answer)) {
          return {
            id: 'extra_todos',
            domain: 'career',
            buildQuestion: () => "Go ahead — what else?",
            collect: 'extraTodos',
            parse: (a: string) => {
              const extra    = parseTodos(a);
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
      value: 'to do',
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
    return `It's ${dayName}, ${userName}. How did this week go? Tell me your main wins.`;
  },
  steps: [
    {
      id: 'wins',
      domain: 'journal',
      buildQuestion: () => "What's the most important thing you achieved this week?",
      collect: 'wins',
    },
    {
      id: 'improvements',
      domain: 'journal',
      buildQuestion: () => "Is there anything you want to improve next week?",
      collect: 'improvements',
    },
    {
      id: 'mood',
      domain: 'journal',
      buildQuestion: () => "How do you feel overall? One word.",
      collect: 'mood',
      parse: parseMood,
    },
  ],
  buildConfirmation: (collected) => [
    { label: 'Wins',         value: (collected['wins'] as string) ?? '',      icon: '🏆', status: 'ok' },
    { label: 'Improvements', value: (collected['improvements'] as string) ?? '', icon: '📈', status: 'ok' },
    { label: 'Mood',         value: (collected['mood'] as string) ?? 'neutral', icon: '🎯', status: 'ok' },
  ],
};

// ── Script registry ────────────────────────────────────────────────────────

export const SCRIPTS: Record<string, DialogueScript> = {
  morning_habits: MORNING_HABITS_SCRIPT,
  todo_creation:  TODO_CREATION_SCRIPT,
  weekly_checkin: WEEKLY_CHECKIN_SCRIPT,
};

export function getScript(id: string): DialogueScript | null {
  return SCRIPTS[id] ?? null;
}

export function getScriptSteps(scriptId: string, ctx: DialogueContext): DialogueStep[] {
  if (scriptId === 'morning_habits') {
    return [
      ...buildHabitSteps(ctx.habitNames),
      {
        id: 'mood',
        domain: 'habits',
        buildQuestion: (collected) => {
          const done  = Object.entries(collected).filter(([k, v]) => k.startsWith('habit_') && v === true).length;
          const total = ctx.habitNames.length;
          return `Nice — ${done} out of ${total} habits completed. How's your energy today?`;
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

  const currentStep    = steps[stepIndex];
  const parsedValue    = currentStep.parse ? currentStep.parse(userAnswer) : userAnswer;
  const updatedCollected = { ...collected, [currentStep.collect]: parsedValue };

  const dynamicStep = currentStep.dynamic?.(userAnswer, updatedCollected, ctx);
  if (dynamicStep) {
    const dynamicQuestion = dynamicStep.buildQuestion(updatedCollected, ctx);
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

  const nextStep    = steps[nextIndex];
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

// ── Build commit payload ───────────────────────────────────────────────────

export interface CommitPayload {
  transcript: string;
  habit_mentions: Array<{ name: string; completed: boolean }>;
  goal_titles: string[];
  create_journal_entry: boolean;
  mood: string | null;
}

export function buildCommitPayload(
  scriptId: string,
  collected: Record<string, unknown>,
  ctx: DialogueContext,
): CommitPayload {
  if (scriptId === 'morning_habits') {
    const habitMentions = ctx.habitNames.map(name => ({
      name,
      completed: (collected[`habit_${name}`] as boolean) ?? false,
    }));
    const summary = habitMentions.map(h => `${h.name}: ${h.completed ? '✓' : '✗'}`).join(', ');
    return {
      transcript: `Morning check-in ${new Date().toLocaleDateString('en-US')}. ${summary}`,
      habit_mentions: habitMentions,
      goal_titles: [],
      create_journal_entry: true,
      mood: (collected['mood'] as string) ?? null,
    };
  }

  if (scriptId === 'todo_creation') {
    const todos = (collected['rawTodos'] as string[]) ?? [];
    return {
      transcript: `Today's tasks: ${todos.join(', ')}`,
      habit_mentions: [],
      goal_titles: todos,
      create_journal_entry: false,
      mood: null,
    };
  }

  if (scriptId === 'weekly_checkin') {
    const wins         = (collected['wins'] as string) ?? '';
    const improvements = (collected['improvements'] as string) ?? '';
    return {
      transcript: `Weekly check-in. Wins: ${wins}. Improvements: ${improvements}`,
      habit_mentions: [],
      goal_titles: [],
      create_journal_entry: true,
      mood: (collected['mood'] as string) ?? null,
    };
  }

  return { transcript: '', habit_mentions: [], goal_titles: [], create_journal_entry: false, mood: null };
}
