import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { DEFAULT_FORM_TEMPLATES } from '@/lib/defaultFormTemplates';

function departmentMatchesCategory(name: string, category: string): boolean {
  const n = name.trim().toLowerCase();
  if (category === 'qc') return n.includes('qc') || n.includes('quality');
  if (category === 'marketing') return n.includes('market');
  if (category === 'kitchen') return n.includes('kitchen') || n.includes('chef');
  if (category === 'cash') return n.includes('cash') || n.includes('cashier');
  return false;
}

export async function POST() {
  await requireOwner();

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });

  let created = 0;
  let updated = 0;

  for (const [index, tpl] of DEFAULT_FORM_TEMPLATES.entries()) {
    const existing = await prisma.managementFormTemplate.findFirst({
      where:
        tpl.category === 'qc'
          ? {
              category: 'qc',
              OR: [
                { title: tpl.title },
                { title: 'Quality Control (Kitchen)' },
                { title: 'Quality Control' },
              ],
            }
          : { title: tpl.title, category: tpl.category },
      select: { id: true },
    });

    const matchingDepartmentIds = departments
      .filter((d) => departmentMatchesCategory(d.name, tpl.category))
      .map((d) => d.id);

    const baseData = {
      title: tpl.title,
      category: tpl.category,
      description: tpl.description ?? null,
      fieldsJson: JSON.stringify(tpl.fields),
      active: true,
      sortOrder: index,
    };

    if (existing) {
      await prisma.managementFormTemplate.update({
        where: { id: existing.id },
        data: baseData,
      });
      await prisma.formTemplateDepartment.deleteMany({
        where: { templateId: existing.id },
      });
      if (matchingDepartmentIds.length > 0) {
        await prisma.formTemplateDepartment.createMany({
          data: matchingDepartmentIds.map((departmentId) => ({
            templateId: existing.id,
            departmentId,
          })),
        });
      }
      updated += 1;
    } else {
      const createdTemplate = await prisma.managementFormTemplate.create({
        data: baseData,
        select: { id: true },
      });
      if (matchingDepartmentIds.length > 0) {
        await prisma.formTemplateDepartment.createMany({
          data: matchingDepartmentIds.map((departmentId) => ({
            templateId: createdTemplate.id,
            departmentId,
          })),
        });
      }
      created += 1;
    }
  }

  return Response.json({
    ok: true,
    created,
    updated,
    total: DEFAULT_FORM_TEMPLATES.length,
  });
}

