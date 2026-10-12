import type { PrismaClient } from '@prisma/client';

export type TemplateSnapshotInput = {
  templateId: string;
  category: string;
  title: string;
  description: string | null;
  fieldsJson: string;
  publishedById?: string | null;
};

function snapshotEquals(
  a: { category: string; title: string; description: string | null; fieldsJson: string },
  b: { category: string; title: string; description: string | null; fieldsJson: string }
): boolean {
  return (
    a.category === b.category &&
    a.title === b.title &&
    (a.description ?? '') === (b.description ?? '') &&
    a.fieldsJson === b.fieldsJson
  );
}

/**
 * Published templates are immutable. Creating or editing published content
 * always inserts a new FormTemplateVersion; historical versions are never updated.
 */
export async function publishFormTemplateVersion(
  prisma: PrismaClient,
  input: TemplateSnapshotInput
): Promise<{ id: string; versionNumber: number }> {
  const latest = await prisma.formTemplateVersion.findFirst({
    where: { templateId: input.templateId },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      category: true,
      title: true,
      description: true,
      fieldsJson: true,
    },
  });

  if (
    latest &&
    snapshotEquals(latest, {
      category: input.category,
      title: input.title,
      description: input.description,
      fieldsJson: input.fieldsJson,
    })
  ) {
    await prisma.managementFormTemplate.update({
      where: { id: input.templateId },
      data: { currentVersionId: latest.id, fieldsJson: input.fieldsJson },
    });
    return { id: latest.id, versionNumber: latest.versionNumber };
  }

  const nextNumber = (latest?.versionNumber ?? 0) + 1;
  const created = await prisma.formTemplateVersion.create({
    data: {
      templateId: input.templateId,
      versionNumber: nextNumber,
      category: input.category,
      title: input.title,
      description: input.description,
      fieldsJson: input.fieldsJson,
      publishedById: input.publishedById ?? null,
    },
    select: { id: true, versionNumber: true },
  });

  await prisma.managementFormTemplate.update({
    where: { id: input.templateId },
    data: { currentVersionId: created.id, fieldsJson: input.fieldsJson },
  });

  return created;
}

/**
 * If a live template has never been versioned, snapshot it as version 1
 * (the currently published definition) before any further edits.
 */
export async function ensurePublishedVersion(
  prisma: PrismaClient,
  template: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    fieldsJson: string;
    currentVersionId: string | null;
  },
  publishedById?: string | null
): Promise<{ id: string; versionNumber: number }> {
  if (template.currentVersionId) {
    const existing = await prisma.formTemplateVersion.findUnique({
      where: { id: template.currentVersionId },
      select: { id: true, versionNumber: true },
    });
    if (existing) return existing;
  }
  return publishFormTemplateVersion(prisma, {
    templateId: template.id,
    category: template.category,
    title: template.title,
    description: template.description,
    fieldsJson: template.fieldsJson,
    publishedById,
  });
}

export async function resolveTemplateFieldsJson(
  prisma: PrismaClient,
  template: { id: string; fieldsJson: string; currentVersionId: string | null }
): Promise<{ versionId: string | null; fieldsJson: string }> {
  if (template.currentVersionId) {
    const ver = await prisma.formTemplateVersion.findUnique({
      where: { id: template.currentVersionId },
      select: { id: true, fieldsJson: true },
    });
    if (ver) return { versionId: ver.id, fieldsJson: ver.fieldsJson };
  }
  return { versionId: template.currentVersionId, fieldsJson: template.fieldsJson };
}

/**
 * Historical submissions render ONLY the pinned version snapshot.
 * Live catalog fieldsJson is used solely when no version was pinned (pre-0016 rows).
 */
export function pinnedSubmissionFieldsJson(opts: {
  versionFieldsJson: string | null | undefined;
  liveFieldsJson: string;
}): string {
  const pinned = opts.versionFieldsJson;
  if (typeof pinned === 'string' && pinned.length > 0) return pinned;
  return opts.liveFieldsJson;
}
