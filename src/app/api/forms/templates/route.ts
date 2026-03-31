import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner, requireSession } from '@/lib/session';
import { formTemplateFieldsSchema } from '@/lib/formTemplate';
import { canFillManagementForm, normalizeUserRole, type FormViewContext } from '@/lib/formVisibility';
import { z } from 'zod';

const createSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.unknown(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  departmentIds: z.array(z.string()).optional(),
});

type TemplateWithDepts = Awaited<
  ReturnType<
    typeof prisma.managementFormTemplate.findMany<{ include: { departmentAssignments: true } }>
  >
>[number];

function mapTemplatesForResponse(templates: TemplateWithDepts[]) {
  return templates.map((t) => ({
    ...t,
    fields: JSON.parse(t.fieldsJson) as unknown[],
    departmentIds: t.departmentAssignments.map((a) => a.departmentId),
  }));
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const where: { category?: string; active?: boolean } = {};
  if (category) where.category = category;
  if (!(role === 'owner' && includeInactive)) {
    where.active = true;
  }

  const templates = await prisma.managementFormTemplate.findMany({
    where,
    include: { departmentAssignments: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  if (role === 'owner') {
    return Response.json(mapTemplatesForResponse(templates));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });

  const ctx: FormViewContext = {
    userRole: role,
    employeeDepartmentId: user?.employee?.departmentId ?? null,
    employeeDepartmentName: user?.employee?.department?.name ?? null,
  };

  const visible = templates.filter((t) =>
    canFillManagementForm(ctx, {
      category: t.category,
      departmentAssignments: t.departmentAssignments,
    })
  );

  return Response.json(mapTemplatesForResponse(visible));
}

export async function POST(req: NextRequest) {
  await requireOwner();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const fieldsParsed = formTemplateFieldsSchema.safeParse(parsed.data.fields);
  if (!fieldsParsed.success) return Response.json(fieldsParsed.error.flatten(), { status: 400 });

  if (fieldsParsed.data.length === 0) {
    return Response.json({ error: 'Add at least one field' }, { status: 400 });
  }

  const keys = fieldsParsed.data.map((f) => f.key);
  if (new Set(keys).size !== keys.length) {
    return Response.json({ error: 'Duplicate field keys' }, { status: 400 });
  }

  const t = await prisma.managementFormTemplate.create({
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fieldsJson: JSON.stringify(fieldsParsed.data),
      active: parsed.data.active ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
      ...(parsed.data.departmentIds?.length
        ? {
            departmentAssignments: {
              create: parsed.data.departmentIds.map((departmentId) => ({ departmentId })),
            },
          }
        : {}),
    },
    include: { departmentAssignments: true },
  });

  return Response.json({
    ...t,
    fields: fieldsParsed.data,
    departmentIds: t.departmentAssignments.map((a) => a.departmentId),
  });
}
