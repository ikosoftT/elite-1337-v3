import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { recordPresence } from '@/lib/site-presence';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };
const body = z.object({ path: z.string().max(200) });

/** Accepts a private, best-effort heartbeat only for the authenticated session student. */
export async function POST(request: NextRequest) {
  const session = await auth();
  const parsed = body.safeParse(await request.json().catch(() => null));
  const id = session?.user?.id && /^\d+$/.test(session.user.id) ? Number(session.user.id) : null;
  const login = session?.user?.login;
  if (parsed.success && id && login) after(() => recordPresence(id, login, parsed.data.path));
  return new NextResponse(null, { status: 204, headers: noStore });
}
