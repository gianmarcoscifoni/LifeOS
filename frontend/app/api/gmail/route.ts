import { auth } from '@/auth';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;       // ISO
  isUnread: boolean;
  isImportant: boolean;
  labelIds: string[];
}

function headerVal(headers: { name: string; value: string }[], name: string) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (m) return { name: m[1].replace(/^"|"$/g, '').trim(), email: m[2] };
  return { name: raw, email: raw };
}

export async function GET() {
  const session = await auth();

  if (!session?.access_token) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const token = session.access_token;

  // Fetch important + unread message IDs (last 25)
  const query  = encodeURIComponent('is:unread OR is:important newer_than:3d');
  const listRes = await fetch(
    `${GMAIL}/messages?q=${query}&maxResults=25`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    return Response.json({ error: 'gmail_api_error', detail: err }, { status: listRes.status });
  }

  const list = await listRes.json() as { messages?: { id: string; threadId: string }[] };
  const ids = (list.messages ?? []).slice(0, 15);

  if (ids.length === 0) {
    return Response.json({ messages: [] });
  }

  // Parallel fetch metadata for each message
  const messages: (GmailMessage | null)[] = await Promise.all(
    ids.map(async ({ id, threadId }) => {
      const msgRes = await fetch(
        `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!msgRes.ok) return null;

      const msg = await msgRes.json() as {
        id: string;
        threadId: string;
        snippet: string;
        labelIds: string[];
        payload: { headers: { name: string; value: string }[] };
        internalDate: string;
      };

      const headers  = msg.payload?.headers ?? [];
      const rawFrom  = headerVal(headers, 'From');
      const { name: fromName, email: from } = parseFrom(rawFrom);
      const subject  = headerVal(headers, 'Subject') || '(no subject)';
      const date     = new Date(Number(msg.internalDate)).toISOString();
      const labelIds = msg.labelIds ?? [];

      return {
        id: msg.id,
        threadId: msg.threadId ?? threadId,
        from,
        fromName,
        subject,
        snippet: msg.snippet ?? '',
        date,
        isUnread:    labelIds.includes('UNREAD'),
        isImportant: labelIds.includes('IMPORTANT'),
        labelIds,
      } satisfies GmailMessage;
    }),
  );

  const valid = messages.filter(Boolean) as GmailMessage[];

  // Sort: unread + important first
  valid.sort((a, b) => {
    const scoreA = (a.isUnread ? 2 : 0) + (a.isImportant ? 1 : 0);
    const scoreB = (b.isUnread ? 2 : 0) + (b.isImportant ? 1 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return Response.json({ messages: valid });
}
