import { NextRequest } from 'next/server';

export const maxDuration = 300; // 5 min — needs Vercel Pro; hobby cap is 60s

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_KEY  = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || 'lifeos-dev-key';

interface QAPair {
  question: string;
  answer: string;
  topic: string | null;
  quality_score: number | null;
  ai_feedback: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  const { interviewId } = await params;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured in frontend env' }, { status: 500 });
  }

  const { raw_transcript: rawTranscript, company, role } = await req.json() as {
    raw_transcript: string;
    company: string;
    role: string;
  };

  if (!rawTranscript?.trim()) {
    return Response.json({ error: 'raw_transcript is required' }, { status: 400 });
  }

  // ── Step 1: call Claude to parse Q&A ────────────────────────────────────
  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'You are an expert technical interview coach. Extract structured Q&A data from raw transcripts. Respond with valid JSON only — no markdown fences, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Analyze this interview transcript for a ${role} position at ${company}.

Extract all interviewer question + candidate answer pairs.
Skip: filler phrases ("Thank you for watching"), audio artifacts, unintelligible fragments, off-topic chatter.

For each pair return:
- "question": clean interviewer question
- "answer": candidate answer, cleaned up
- "topic": one of Technical | Behavioral | Process | Security | Architecture | Soft Skills | Other
- "quality_score": integer 1-5 (5=excellent, 1=weak/missing)
- "ai_feedback": one-sentence improvement tip, or null if strong

Return ONLY a JSON object with a "pairs" array. Example shape:
{"pairs":[{"question":"...","answer":"...","topic":"Technical","quality_score":4,"ai_feedback":null}]}

TRANSCRIPT:
${rawTranscript}`,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return Response.json({ error: `Claude API error ${claudeRes.status}: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const claudeJson = await claudeRes.json() as { content: { text: string }[] };
  let raw = claudeJson.content[0]?.text?.trim() ?? '{}';

  // Strip accidental markdown fences
  if (raw.startsWith('```')) {
    raw = raw.slice(raw.indexOf('\n') + 1);
    raw = raw.slice(0, raw.lastIndexOf('```')).trim();
  }

  let pairs: QAPair[] = [];
  try {
    const parsed = JSON.parse(raw) as { pairs?: QAPair[] };
    pairs = (parsed.pairs ?? []).filter(p => p.question?.trim());
  } catch {
    return Response.json({ error: `Failed to parse Claude response: ${raw.slice(0, 200)}` }, { status: 502 });
  }

  if (pairs.length === 0) {
    return Response.json({ error: 'No Q&A pairs extracted — try a cleaner transcript' }, { status: 422 });
  }

  // ── Step 2: save to backend (no Claude call there) ───────────────────────
  const saveRes = await fetch(`${API_BASE}/api/career/interviews/${interviewId}/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({ pairs }),
  });

  if (!saveRes.ok) {
    const err = await saveRes.text();
    return Response.json({ error: `Backend save error ${saveRes.status}: ${err.slice(0, 200)}` }, { status: saveRes.status });
  }

  const interview = await saveRes.json();
  return Response.json(interview);
}
