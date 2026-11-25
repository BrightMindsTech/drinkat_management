import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireQcFormTemplateEditor } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import {
  addComplaintChannel,
  addInspectionItem,
  asComplaintTemplate,
  asInspectionTemplate,
  deleteComplaintChannel,
  deleteInspectionItem,
  isQcEditableFormKind,
  loadAllQcFormTemplates,
  loadQcFormTemplate,
  publicQcFormCatalog,
  saveQcFormTemplate,
} from '@/lib/qc-form-templates';
import { CUSTOMER_COMPLAINT_KIND } from '@/lib/qc-complaints';

const bodySchema = z.object({
  kind: z.string(),
  action: z.enum(['add', 'delete']),
  sectionId: z.string().max(16).optional(),
  itemId: z.string().max(32).optional(),
  channelId: z.string().max(32).optional(),
  titleEn: z.string().max(80).optional(),
  titleAr: z.string().max(80).optional(),
});

export const GET = withApiErrors(async function GET() {
  await requireQcFormTemplateEditor();
  const templates = await loadAllQcFormTemplates(prisma);
  return Response.json(publicQcFormCatalog(templates));
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requireQcFormTemplateEditor();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success || !isQcEditableFormKind(parsed.data.kind)) {
    return Response.json({ error: 'Choose a form' }, { status: 400 });
  }
  const current = await loadQcFormTemplate(prisma, parsed.data.kind);
  if (parsed.data.kind === CUSTOMER_COMPLAINT_KIND) {
    const tpl = asComplaintTemplate(current);
    if (!tpl) return Response.json({ error: 'Choose a form' }, { status: 400 });
    const next =
      parsed.data.action === 'add'
        ? addComplaintChannel(tpl, { titleEn: parsed.data.titleEn ?? '', titleAr: parsed.data.titleAr ?? '' })
        : deleteComplaintChannel(tpl, parsed.data.channelId ?? '');
    if (!next.ok) return Response.json({ error: next.error }, { status: 400 });
    await saveQcFormTemplate(prisma, next.template);
  } else {
    const tpl = asInspectionTemplate(current);
    if (!tpl) return Response.json({ error: 'Choose a form' }, { status: 400 });
    const next =
      parsed.data.action === 'add'
        ? addInspectionItem(tpl, {
            sectionId: parsed.data.sectionId ?? '',
            titleEn: parsed.data.titleEn ?? '',
            titleAr: parsed.data.titleAr ?? '',
          })
        : deleteInspectionItem(tpl, parsed.data.itemId ?? '');
    if (!next.ok) return Response.json({ error: next.error }, { status: 400 });
    await saveQcFormTemplate(prisma, next.template);
  }
  const templates = await loadAllQcFormTemplates(prisma);
  return Response.json(publicQcFormCatalog(templates));
});
