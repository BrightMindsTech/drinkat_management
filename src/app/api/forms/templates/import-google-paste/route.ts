import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { parseGoogleFormPaste } from '@/lib/google-form-extract';
import {
  getKitchenDepartmentIds,
  upsertKitchenFormTemplate,
} from '@/lib/importKitchenFormTemplate';

const bodySchema = z.object({
  paste: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireOwner();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = parseGoogleFormPaste(body.paste);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const matchingDepartmentIds = await getKitchenDepartmentIds();
    const existingCount = await prisma.managementFormTemplate.count({
      where: { category: 'kitchen' },
    });

    const result = await upsertKitchenFormTemplate(
      {
        title: parsed.title,
        description: parsed.description,
        fields: parsed.fields,
      },
      100 + existingCount,
      matchingDepartmentIds
    );

    return Response.json({
      ok: true,
      title: parsed.title,
      fieldCount: parsed.fields.length,
      result,
    });
  } catch (e) {
    console.error('[import-google-paste]', e);
    return Response.json(
      { error: 'Import failed while saving the form. Please try again.' },
      { status: 500 }
    );
  }
}
