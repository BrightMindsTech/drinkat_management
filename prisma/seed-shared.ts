import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DRINKAT_FORM_SEEDS } from '../src/lib/drinkatFormDefinitions';

export async function seedDatabase(prisma: PrismaClient) {
  const names = ['MEU Branch', 'HU Branch', 'Airport Street Branch'];
  for (const name of names) {
    await prisma.branch.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const deptNames = ['Staff', 'QC', 'Manager', 'Marketing', 'Kitchen'];
  for (const name of deptNames) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const ownerHash = await bcrypt.hash('owner123', 10);
  await prisma.user.upsert({
    where: { email: 'owner@drinkat.com' },
    // Always refresh hash so re-seed fixes bad/stale passwords (upsert update:{} skipped this before).
    update: { passwordHash: ownerHash, role: 'owner' },
    create: {
      email: 'owner@drinkat.com',
      passwordHash: ownerHash,
      role: 'owner',
    },
  });

  console.log('Seeded branches, departments and owner user (owner@drinkat.com / owner123)');

  const allDepts = await prisma.department.findMany();
  const deptIdByName = new Map(allDepts.map((d) => [d.name, d.id]));

  for (const seed of DRINKAT_FORM_SEEDS) {
    const fieldsJson = JSON.stringify(seed.fields);
    const deptIds = seed.assignedDepartmentNames
      .map((n) => deptIdByName.get(n))
      .filter((id): id is string => !!id);

    const existing = await prisma.managementFormTemplate.findFirst({
      where: { category: seed.category, title: seed.title },
    });

    if (existing) {
      await prisma.managementFormTemplate.update({
        where: { id: existing.id },
        data: {
          description: seed.description ?? null,
          sortOrder: seed.sortOrder,
          fieldsJson,
        },
      });
      await prisma.formTemplateDepartment.deleteMany({ where: { templateId: existing.id } });
      if (deptIds.length > 0) {
        await prisma.formTemplateDepartment.createMany({
          data: deptIds.map((departmentId) => ({ templateId: existing.id, departmentId })),
        });
      }
    } else {
      await prisma.managementFormTemplate.create({
        data: {
          category: seed.category,
          title: seed.title,
          description: seed.description ?? null,
          fieldsJson,
          sortOrder: seed.sortOrder,
          ...(deptIds.length > 0
            ? {
                departmentAssignments: {
                  create: deptIds.map((departmentId) => ({ departmentId })),
                },
              }
            : {}),
        },
      });
    }
  }
  console.log('Synced Drinkat management forms (questions from Google Forms; assignments by department)');
}
