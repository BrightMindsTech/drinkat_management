import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/session';

/** Form submissions are read-only after submit (no approve/deny workflow). */
export async function PATCH(_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) {
  await requireSession();
  return Response.json(
    { error: 'Form submissions are informational only; approval is not required.' },
    { status: 403 }
  );
}
