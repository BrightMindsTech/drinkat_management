import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { listChatEligiblePeers, listGroupChatEligibleUsers, roleMayUseChat } from '@/lib/chat-policy';
import { apiErrorResponse } from '@/lib/api-route-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const scope = req.nextUrl.searchParams.get('scope');
    const users =
      scope === 'group'
        ? await listGroupChatEligibleUsers(prisma, session.user.id, session.user.role)
        : await listChatEligiblePeers(prisma, session.user.id, session.user.role);
    return Response.json({ users });
  } catch (e) {
    return apiErrorResponse('chat/users', e, 'Failed to load users');
  }
}
