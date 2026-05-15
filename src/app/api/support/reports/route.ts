import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { getOwnerUserIds } from '@/lib/time-clock-helpers';
import { notifyUsers } from '@/lib/user-notify';
import { apiErrorResponse } from '@/lib/api-route-error';
import {
  normalizeScreenshotPaths,
  parseScreenshotPaths,
  serializeScreenshotPaths,
} from '@/lib/support-reports';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(8000),
  screenshotPaths: z.array(z.string()).max(5).optional(),
});

function displayNameForUser(u: {
  email: string;
  employee: { name: string } | null;
}): string {
  return u.employee?.name?.trim() || u.email.split('@')[0] || u.email;
}

export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    const isOwner = role === 'owner';

    const rows = await prisma.supportReport.findMany({
      where: isOwner ? undefined : { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: isOwner ? 200 : 50,
      include: {
        user: {
          select: {
            email: true,
            role: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    return Response.json({
      isOwner,
      reports: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        screenshotPaths: parseScreenshotPaths(r.screenshotsJson),
        createdAt: r.createdAt.toISOString(),
        submitter: {
          userId: r.userId,
          displayName: displayNameForUser(r.user),
          email: r.user.email,
          role: r.user.role,
        },
      })),
    });
  } catch (e) {
    return apiErrorResponse('support/reports GET', e, 'Failed to load support reports');
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const raw = await req.json();
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

    const screenshotPaths = normalizeScreenshotPaths(parsed.data.screenshotPaths ?? []);
    const report = await prisma.supportReport.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        screenshotsJson: serializeScreenshotPaths(screenshotPaths),
      },
      include: {
        user: {
          select: {
            email: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    const submitterName = displayNameForUser(report.user);
    const ownerIds = await getOwnerUserIds();
    if (ownerIds.length > 0) {
      const href = '/dashboard/support';
      await notifyUsers(prisma, ownerIds, {
        category: 'support_report',
        title: 'Technical support report',
        body: `${submitterName}: ${report.title}`,
        dataJson: JSON.stringify({
          type: 'support_report',
          reportId: report.id,
          href,
        }),
        push: {
          title: 'Technical support report',
          body: `${submitterName}: ${report.title}`,
          data: { type: 'support_report', url: href, reportId: report.id },
        },
      });
    }

    return Response.json({
      ok: true,
      report: {
        id: report.id,
        title: report.title,
        description: report.description,
        screenshotPaths,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorResponse('support/reports POST', e, 'Failed to submit support report');
  }
}
