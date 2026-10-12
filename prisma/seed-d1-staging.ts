/**
 * Seeds ISOLATED staging D1 only. Refuses production database ids.
 * Run: STAGING_TEST_PASSWORD=... npx tsx prisma/seed-d1-staging.ts
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const STAGING_D1_ID = '9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c';

function assertStagingConfig() {
  const raw = readFileSync(new URL('../wrangler.seed-d1-staging.jsonc', import.meta.url), 'utf8');
  if (raw.includes(PRODUCTION_D1_ID) || raw.includes('drinkat-management')) {
    throw new Error('REFUSED: staging seed config points at production');
  }
  if (!raw.includes(STAGING_D1_ID)) {
    throw new Error('REFUSED: staging seed config missing staging D1 id');
  }
}

async function main() {
  assertStagingConfig();
  const password = process.env.STAGING_TEST_PASSWORD?.trim();
  if (!password || password.length < 10) {
    throw new Error('STAGING_TEST_PASSWORD is required (min 10 chars)');
  }

  const { env, dispose } = await getPlatformProxy({
    configPath: 'wrangler.seed-d1-staging.jsonc',
    remoteBindings: true,
  });
  const d1 = env.DB;
  if (!d1) throw new Error('Missing D1 binding DB');
  const prisma = new PrismaClient({ adapter: new PrismaD1(d1) });
  const hash = await bcrypt.hash(password, 10);

  try {
    const branchA = await prisma.branch.upsert({
      where: { name: 'Staging Branch A' },
      update: {},
      create: { name: 'Staging Branch A' },
    });
    const branchB = await prisma.branch.upsert({
      where: { name: 'Staging Branch B' },
      update: {},
      create: { name: 'Staging Branch B' },
    });

    const deptNames = ['Staff', 'QC', 'Manager', 'Marketing'];
    const deptId: Record<string, string> = {};
    for (const name of deptNames) {
      const d = await prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      deptId[name] = d.id;
    }

    async function upsertUser(email: string, role: string, branchId: string | null) {
      return prisma.user.upsert({
        where: { email },
        update: { passwordHash: hash, role, branchId },
        create: { email, passwordHash: hash, role, branchId },
      });
    }

    const owner = await upsertUser('stg-owner@qc-staging.local', 'owner', null);
    const qcUser = await upsertUser('stg-qc@qc-staging.local', 'qc', branchA.id);
    const mgrAUser = await upsertUser('stg-manager-a@qc-staging.local', 'manager', branchA.id);
    const mgrBUser = await upsertUser('stg-manager-b@qc-staging.local', 'manager', branchB.id);
    const amUser = await upsertUser('stg-am@qc-staging.local', 'assistant_manager', branchA.id);
    const staffAUser = await upsertUser('stg-staff-a@qc-staging.local', 'staff', branchA.id);
    const staffBUser = await upsertUser('stg-staff-b@qc-staging.local', 'staff', branchB.id);
    const mktUser = await upsertUser('stg-marketing@qc-staging.local', 'marketing', branchA.id);

    async function upsertEmployee(opts: {
      userId: string;
      name: string;
      role: string;
      branchId: string;
      departmentId: string;
      reportsToEmployeeId?: string | null;
    }) {
      const existing = await prisma.employee.findUnique({ where: { userId: opts.userId } });
      if (existing) {
        return prisma.employee.update({
          where: { id: existing.id },
          data: {
            name: opts.name,
            role: opts.role,
            branchId: opts.branchId,
            departmentId: opts.departmentId,
            reportsToEmployeeId: opts.reportsToEmployeeId ?? null,
            status: 'active',
          },
        });
      }
      return prisma.employee.create({
        data: {
          userId: opts.userId,
          name: opts.name,
          role: opts.role,
          branchId: opts.branchId,
          departmentId: opts.departmentId,
          reportsToEmployeeId: opts.reportsToEmployeeId ?? null,
          status: 'active',
        },
      });
    }

    const qcEmp = await upsertEmployee({
      userId: qcUser.id,
      name: 'Staging QC',
      role: 'qc',
      branchId: branchA.id,
      departmentId: deptId.QC,
    });
    const mgrA = await upsertEmployee({
      userId: mgrAUser.id,
      name: 'Staging Manager A',
      role: 'manager',
      branchId: branchA.id,
      departmentId: deptId.Manager,
    });
    const mgrB = await upsertEmployee({
      userId: mgrBUser.id,
      name: 'Staging Manager B',
      role: 'manager',
      branchId: branchB.id,
      departmentId: deptId.Manager,
    });
    await upsertEmployee({
      userId: amUser.id,
      name: 'Staging Assistant Manager',
      role: 'assistant_manager',
      branchId: branchA.id,
      departmentId: deptId.Staff,
      reportsToEmployeeId: mgrA.id,
    });
    const staffA = await upsertEmployee({
      userId: staffAUser.id,
      name: 'Staging Staff A',
      role: 'staff',
      branchId: branchA.id,
      departmentId: deptId.Staff,
      reportsToEmployeeId: mgrA.id,
    });
    await upsertEmployee({
      userId: staffBUser.id,
      name: 'Staging Staff B',
      role: 'staff',
      branchId: branchB.id,
      departmentId: deptId.Staff,
      reportsToEmployeeId: mgrB.id,
    });
    await upsertEmployee({
      userId: mktUser.id,
      name: 'Staging Marketing',
      role: 'marketing',
      branchId: branchA.id,
      departmentId: deptId.Marketing,
    });

    const v1Fields = JSON.stringify([
      { key: 'old_field', label: 'Legacy question', type: 'text', required: true },
      { key: 'photo_evidence', label: 'Photo evidence', type: 'photo', required: false },
    ]);
    const liveFields = JSON.stringify([
      { key: 'old_field', label: 'Legacy question', type: 'text', required: true },
      { key: 'new_field', label: 'New question after version', type: 'text', required: false },
      { key: 'photo_evidence', label: 'Photo evidence', type: 'photo', required: false },
    ]);

    let template = await prisma.managementFormTemplate.findFirst({
      where: { title: 'Staging Ops Check' },
    });
    if (!template) {
      template = await prisma.managementFormTemplate.create({
        data: {
          category: 'ops',
          title: 'Staging Ops Check',
          description: 'Synthetic staging form for Phase 1 validation',
          fieldsJson: liveFields,
          sortOrder: 1,
          departmentAssignments: { create: [{ departmentId: deptId.Staff }] },
        },
      });
    } else {
      template = await prisma.managementFormTemplate.update({
        where: { id: template.id },
        data: { fieldsJson: liveFields, category: 'ops' },
      });
    }

    let version = await prisma.formTemplateVersion.findFirst({
      where: { templateId: template.id, versionNumber: 1 },
    });
    if (!version) {
      version = await prisma.formTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          category: 'ops',
          title: 'Staging Ops Check',
          description: 'v1 legacy snapshot',
          fieldsJson: v1Fields,
          publishedById: owner.id,
        },
      });
    } else {
      // Keep v1 fields frozen even if the helper is re-run.
    }

    let version2 = await prisma.formTemplateVersion.findFirst({
      where: { templateId: template.id, versionNumber: 2 },
    });
    if (!version2) {
      version2 = await prisma.formTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 2,
          category: 'ops',
          title: 'Staging Ops Check',
          description: 'v2 live published snapshot',
          fieldsJson: liveFields,
          publishedById: owner.id,
        },
      });
    } else if (version2.fieldsJson !== liveFields) {
      // Published versions are immutable; keep existing v2.
    }

    await prisma.managementFormTemplate.update({
      where: { id: template.id },
      data: { currentVersionId: version2.id, fieldsJson: liveFields },
    });

    const existingSub = await prisma.managementFormSubmission.findFirst({
      where: { id: 'stg_hist_sub_1' },
    });
    if (!existingSub) {
      await prisma.managementFormSubmission.create({
        data: {
          id: 'stg_hist_sub_1',
          templateId: template.id,
          templateVersionId: version.id,
          employeeId: staffA.id,
          branchId: branchA.id,
          answersJson: JSON.stringify({ old_field: 'legacy-answer-must-render' }),
          status: 'submitted',
        },
      });
    }

    let qcTemplate = await prisma.managementFormTemplate.findFirst({
      where: { title: 'Staging QC Visit' },
    });
    const qcFields = JSON.stringify([
      { key: 'visit_ok', label: 'Visit OK', type: 'select', required: true, options: ['yes', 'no'] },
    ]);
    if (!qcTemplate) {
      qcTemplate = await prisma.managementFormTemplate.create({
        data: {
          category: 'qc',
          title: 'Staging QC Visit',
          description: 'Synthetic QC form',
          fieldsJson: qcFields,
          sortOrder: 2,
          departmentAssignments: { create: [{ departmentId: deptId.QC }] },
        },
      });
    }
    const qcVer = await prisma.formTemplateVersion.findFirst({
      where: { templateId: qcTemplate.id, versionNumber: 1 },
    });
    if (!qcVer) {
      const created = await prisma.formTemplateVersion.create({
        data: {
          templateId: qcTemplate.id,
          versionNumber: 1,
          category: 'qc',
          title: 'Staging QC Visit',
          fieldsJson: qcFields,
          publishedById: owner.id,
        },
      });
      await prisma.managementFormTemplate.update({
        where: { id: qcTemplate.id },
        data: { currentVersionId: created.id },
      });
    }

    const { QC_DOMAIN_TEMPLATE_FIELDS, QC_WINDOW_TEMPLATES, qcDomainTemplateTitle } = await import(
      '../src/lib/qc-inspection-templates'
    );
    const { QC_INSPECTION_DOMAINS } = await import('../src/lib/qc-domains');
    const activateScheduler = process.env.INSPECTION_SCHEDULER_ENABLED === '1';

    const domainTemplates: { id: string; domain: string }[] = [];
    for (const domain of QC_INSPECTION_DOMAINS) {
      const title = qcDomainTemplateTitle(domain);
      const fieldsJson = JSON.stringify(QC_DOMAIN_TEMPLATE_FIELDS[domain]);
      let tpl = await prisma.managementFormTemplate.findFirst({ where: { title } });
      if (!tpl) {
        tpl = await prisma.managementFormTemplate.create({
          data: {
            category: domain,
            title,
            description: `Guided ${title} inspection`,
            fieldsJson,
            sortOrder: 10,
            departmentAssignments: { create: [{ departmentId: deptId.Staff }] },
          },
        });
      } else {
        tpl = await prisma.managementFormTemplate.update({
          where: { id: tpl.id },
          data: { fieldsJson, category: domain, active: true },
        });
      }
      const latest = await prisma.formTemplateVersion.findFirst({
        where: { templateId: tpl.id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest || latest.fieldsJson !== fieldsJson) {
        const created = await prisma.formTemplateVersion.create({
          data: {
            templateId: tpl.id,
            versionNumber: (latest?.versionNumber ?? 0) + 1,
            category: domain,
            title,
            fieldsJson,
            publishedById: owner.id,
          },
        });
        await prisma.managementFormTemplate.update({
          where: { id: tpl.id },
          data: { currentVersionId: created.id, fieldsJson },
        });
      } else {
        await prisma.managementFormTemplate.update({
          where: { id: tpl.id },
          data: { currentVersionId: latest.id, fieldsJson },
        });
      }
      domainTemplates.push({ id: tpl.id, domain });
    }

    for (const windowTpl of QC_WINDOW_TEMPLATES) {
      const fieldsJson = JSON.stringify(windowTpl.fields);
      let tpl = await prisma.managementFormTemplate.findFirst({ where: { title: windowTpl.title } });
      if (!tpl) {
        tpl = await prisma.managementFormTemplate.create({
          data: {
            category: windowTpl.key,
            title: windowTpl.title,
            fieldsJson,
            sortOrder: 20,
            departmentAssignments: { create: [{ departmentId: deptId.Staff }] },
          },
        });
      } else {
        tpl = await prisma.managementFormTemplate.update({
          where: { id: tpl.id },
          data: { fieldsJson, category: windowTpl.key },
        });
      }
      const latest = await prisma.formTemplateVersion.findFirst({
        where: { templateId: tpl.id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest || latest.fieldsJson !== fieldsJson) {
        const created = await prisma.formTemplateVersion.create({
          data: {
            templateId: tpl.id,
            versionNumber: (latest?.versionNumber ?? 0) + 1,
            category: windowTpl.key,
            title: windowTpl.title,
            fieldsJson,
            publishedById: owner.id,
          },
        });
        await prisma.managementFormTemplate.update({
          where: { id: tpl.id },
          data: { currentVersionId: created.id },
        });
      }
      const existingSched = await prisma.inspectionSchedule.findFirst({
        where: { templateId: tpl.id, label: windowTpl.title },
      });
      const current = await prisma.managementFormTemplate.findUnique({
        where: { id: tpl.id },
        select: { currentVersionId: true },
      });
      if (!existingSched) {
        await prisma.inspectionSchedule.create({
          data: {
            templateId: tpl.id,
            templateVersionId: current?.currentVersionId,
            role: 'staff',
            recurrence: 'daily',
            deadlineTime: windowTpl.window === 'opening' ? '10:00' : '23:30',
            window: windowTpl.window,
            label: windowTpl.title,
            active: activateScheduler,
          },
        });
      } else {
        await prisma.inspectionSchedule.update({
          where: { id: existingSched.id },
          data: { active: activateScheduler, templateVersionId: current?.currentVersionId },
        });
      }
    }

    for (const row of domainTemplates) {
      const existingSched = await prisma.inspectionSchedule.findFirst({
        where: { templateId: row.id, role: 'staff' },
      });
      const current = await prisma.managementFormTemplate.findUnique({
        where: { id: row.id },
        select: { currentVersionId: true },
      });
      const deadline =
        row.domain === 'food_safety' ? '16:00' : row.domain === 'cleaning' ? '21:00' : '18:00';
      if (!existingSched) {
        await prisma.inspectionSchedule.create({
          data: {
            templateId: row.id,
            templateVersionId: current?.currentVersionId,
            role: 'staff',
            recurrence: 'daily',
            deadlineTime: deadline,
            window: 'daytime',
            label: qcDomainTemplateTitle(row.domain as (typeof QC_INSPECTION_DOMAINS)[number]),
            active: activateScheduler,
          },
        });
      } else {
        await prisma.inspectionSchedule.update({
          where: { id: existingSched.id },
          data: { active: activateScheduler, templateVersionId: current?.currentVersionId },
        });
      }
    }

    const defaultSlas: { severity: string; slaHours: number }[] = [
      { severity: 'critical', slaHours: 4 },
      { severity: 'high', slaHours: 24 },
      { severity: 'medium', slaHours: 72 },
      { severity: 'low', slaHours: 168 },
    ];
    for (const sla of defaultSlas) {
      const existing = await prisma.escalationRule.findFirst({ where: { severity: sla.severity } });
      if (!existing) {
        await prisma.escalationRule.create({
          data: {
            severity: sla.severity,
            slaHours: sla.slaHours,
            notifyRolesJson: '["owner","qc"]',
            active: true,
          },
        });
      }
    }
    await prisma.qcAppConfig.upsert({
      where: { key: 'escalation_defaults_approved' },
      update: { value: '0' },
      create: { key: 'escalation_defaults_approved', value: '0' },
    });
    await prisma.qcAppConfig.upsert({
      where: { key: 'kpi_mode' },
      update: { value: 'shadow' },
      create: { key: 'kpi_mode', value: 'shadow' },
    });

    const activeSchedules = await prisma.inspectionSchedule.count({ where: { active: true } });

    console.log('staging seed ok', {
      owner: owner.email,
      qc: qcEmp.name,
      branches: [branchA.name, branchB.name],
      historicalSubmission: 'stg_hist_sub_1',
      publishedOpsVersion: 2,
      activeSchedules,
      schedulerEnabled: activateScheduler,
    });
  } finally {
    await prisma.$disconnect();
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
