import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { apiErrorResponse } from '@/lib/api-route-error';
import { deleteUploadedFile } from '@/lib/upload-storage';
import { parseScreenshotPaths } from '@/lib/support-reports';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    await requireOwner();
    const { id } = await ctx.params;
    const report = await prisma.supportReport.findUnique({ where: { id } });
    if (!report) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const paths = parseScreenshotPaths(report.screenshotsJson);
    for (const p of paths) {
      try {
        await deleteUploadedFile(p);
      } catch (e) {
        console.error('[support/reports DELETE] file delete failed', { path: p, e });
      }
    }

    await prisma.supportReport.delete({ where: { id } });

    return Response.json({ ok: true, deletedId: id });
  } catch (e) {
    return apiErrorResponse('support/reports DELETE', e, 'Failed to delete support report');
  }
}
