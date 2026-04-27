// Server-only endpoint — returns the Anthropic key for server-validated callers.
// Never use NEXT_PUBLIC_ for this key.
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'not_configured' }, { status: 500 });
  return Response.json({ key });
}
