import { NextRequest } from 'next/server';

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_KEY  = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || 'lifeos-dev-key';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = '/api/' + path.join('/');
  const url = new URL(apiPath, API_BASE);

  // Forward query string
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers: Record<string, string> = {
    'X-Api-Key': API_KEY,
  };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  // Passthrough headers (especially Content-Type for SSE)
  const responseHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) responseHeaders.set('content-type', ct);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;
