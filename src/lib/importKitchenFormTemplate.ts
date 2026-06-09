import { prisma } from '@/lib/prisma';
import type { FormFieldDef } from '@/lib/formTemplate';
import { departmentNameMatchesKitchenForm } from '@/lib/kitchen-department';

export function departmentMatchesKitchen(name: string): boolean {
  return departmentNameMatchesKitchenForm(name);
}

export async function getKitchenDepartmentIds(): Promise<string[]> {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  return departments.filter((d) => departmentMatchesKitchen(d.name)).map((d) => d.id);
}

export type KitchenTemplateInput = {
  title: string;
  description?: string;
  fields: FormFieldDef[];
};

export async function upsertKitchenFormTemplate(
  tpl: KitchenTemplateInput,
  sortOrder: number,
  matchingDepartmentIds: string[]
): Promise<'created' | 'updated'> {
  const title = tpl.title.trim();
  const existing = await prisma.managementFormTemplate.findFirst({
    where: { title, category: 'kitchen' },
    select: { id: true },
  });

  const baseData = {
    title,
    category: 'kitchen' as const,
    description: tpl.description ?? null,
    fieldsJson: JSON.stringify(tpl.fields),
    active: true,
    sortOrder,
  };

  if (existing) {
    await prisma.managementFormTemplate.update({
      where: { id: existing.id },
      data: baseData,
    });
    await prisma.formTemplateDepartment.deleteMany({ where: { templateId: existing.id } });
    if (matchingDepartmentIds.length > 0) {
      await prisma.formTemplateDepartment.createMany({
        data: matchingDepartmentIds.map((departmentId) => ({
          templateId: existing.id,
          departmentId,
        })),
      });
    }
    return 'updated';
  }

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
  return 'created';
}
