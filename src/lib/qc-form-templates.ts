import type { PrismaClient } from '@prisma/client';
import {
  BRANCH_INSPECTION_KIND,
  BRANCH_INSPECTION_SECTIONS,
  type InspectionAnswers,
} from '@/lib/qc-branch-inspection';
import { COMPLAINT_CHANNELS, CUSTOMER_COMPLAINT_KIND } from '@/lib/qc-complaints';
import {
  WAREHOUSE_INSPECTION_KIND,
  WAREHOUSE_INSPECTION_SECTIONS,
} from '@/lib/qc-warehouse-inspection';

export const QC_EDITABLE_FORM_KINDS = [
  BRANCH_INSPECTION_KIND,
  WAREHOUSE_INSPECTION_KIND,
  CUSTOMER_COMPLAINT_KIND,
] as const;

export type QcEditableFormKind = (typeof QC_EDITABLE_FORM_KINDS)[number];

export const QC_FORM_TEMPLATE_MAX_ITEMS = 80;
export const QC_FORM_TEMPLATE_MAX_CHANNELS = 12;
export const QC_FORM_TEMPLATE_TITLE_MAX = 80;

export type QcTemplateItem = { id: string; n: number; titleEn: string; titleAr: string };
export type QcTemplateSection = { id: string; titleEn: string; titleAr: string; items: QcTemplateItem[] };
export type QcRetiredItem = { id: string; sectionId: string; titleEn: string; titleAr: string };

export type InspectionFormTemplate = {
  v: 1;
  kind: typeof BRANCH_INSPECTION_KIND | typeof WAREHOUSE_INSPECTION_KIND;
  sections: QcTemplateSection[];
  retiredItems: QcRetiredItem[];
};

export type QcTemplateChannel = { id: string; titleEn: string; titleAr: string; startSlots: number };
export type ComplaintFormTemplate = {
  v: 1;
  kind: typeof CUSTOMER_COMPLAINT_KIND;
  channels: QcTemplateChannel[];
  retiredChannels: { id: string; titleEn: string; titleAr: string }[];
};

export type QcFormTemplate = InspectionFormTemplate | ComplaintFormTemplate;

function configKey(kind: QcEditableFormKind): string {
  return `qc_form_template:${kind}`;
}

function cloneInspectionDefaults(
  kind: InspectionFormTemplate['kind']
): InspectionFormTemplate {
  const src = kind === WAREHOUSE_INSPECTION_KIND ? WAREHOUSE_INSPECTION_SECTIONS : BRANCH_INSPECTION_SECTIONS;
  return {
    v: 1,
    kind,
    retiredItems: [],
    sections: src.map((section) => ({
      id: section.id,
      titleEn: section.titleEn,
      titleAr: section.titleAr,
      items: section.items.map((item) => ({ id: item.id, n: item.n, titleEn: item.titleEn, titleAr: item.titleAr })),
    })),
  };
}

function cloneComplaintDefaults(): ComplaintFormTemplate {
  return {
    v: 1,
    kind: CUSTOMER_COMPLAINT_KIND,
    retiredChannels: [],
    channels: COMPLAINT_CHANNELS.map((ch) => ({
      id: ch.id,
      titleEn: ch.titleEn,
      titleAr: ch.titleAr,
      startSlots: ch.startSlots,
    })),
  };
}

export function defaultQcFormTemplate(kind: QcEditableFormKind): QcFormTemplate {
  if (kind === CUSTOMER_COMPLAINT_KIND) return cloneComplaintDefaults();
  return cloneInspectionDefaults(kind);
}

function trimTitle(v: unknown): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, QC_FORM_TEMPLATE_TITLE_MAX);
}

function isSafeId(id: string): boolean {
  return /^[a-z][a-z0-9_]{0,31}$/.test(id);
}

function newCustomId(prefix: string): string {
  const raw =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}${Math.random()}`;
  return `${prefix}${raw.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10)}`;
}

function itemIds(sections: QcTemplateSection[]): string[] {
  return sections.flatMap((s) => s.items.map((i) => i.id));
}

export function inspectionItemIds(template: InspectionFormTemplate): string[] {
  return itemIds(template.sections);
}

function renumber(section: QcTemplateSection): QcTemplateSection {
  return { ...section, items: section.items.map((item, i) => ({ ...item, n: i + 1 })) };
}

function parseInspectionTemplate(kind: InspectionFormTemplate['kind'], raw: unknown): InspectionFormTemplate {
  const fallback = cloneInspectionDefaults(kind);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const rec = raw as Record<string, unknown>;
  if (rec.kind !== kind) return fallback;
  if (!Array.isArray(rec.sections) || rec.sections.length === 0) return fallback;
  const seen = new Set<string>();
  const sections: QcTemplateSection[] = [];
  for (const row of rec.sections) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const s = row as Record<string, unknown>;
    const id = String(s.id ?? '').trim();
    const titleEn = trimTitle(s.titleEn);
    const titleAr = trimTitle(s.titleAr);
    if (!id || !titleEn || !titleAr) continue;
    const items: QcTemplateItem[] = [];
    if (Array.isArray(s.items)) {
      for (const it of s.items) {
        if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
        const item = it as Record<string, unknown>;
        const itemId = String(item.id ?? '').trim();
        const iEn = trimTitle(item.titleEn);
        const iAr = trimTitle(item.titleAr);
        if (!isSafeId(itemId) || !iEn || !iAr || seen.has(itemId)) continue;
        seen.add(itemId);
        items.push({ id: itemId, n: items.length + 1, titleEn: iEn, titleAr: iAr });
      }
    }
    sections.push(renumber({ id, titleEn, titleAr, items }));
  }
  if (!sections.length || itemIds(sections).length === 0) return fallback;
  const retiredItems: QcRetiredItem[] = [];
  if (Array.isArray(rec.retiredItems)) {
    for (const row of rec.retiredItems.slice(0, 200)) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      if (!isSafeId(id) || seen.has(id) || retiredItems.some((x) => x.id === id)) continue;
      retiredItems.push({
        id,
        sectionId: String(r.sectionId ?? '').trim().slice(0, 16),
        titleEn: trimTitle(r.titleEn) || id,
        titleAr: trimTitle(r.titleAr) || id,
      });
    }
  }
  return { v: 1, kind, sections, retiredItems };
}

function parseComplaintTemplate(raw: unknown): ComplaintFormTemplate {
  const fallback = cloneComplaintDefaults();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const rec = raw as Record<string, unknown>;
  if (rec.kind !== CUSTOMER_COMPLAINT_KIND) return fallback;
  if (!Array.isArray(rec.channels) || rec.channels.length === 0) return fallback;
  const seen = new Set<string>();
  const channels: QcTemplateChannel[] = [];
  for (const row of rec.channels) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const c = row as Record<string, unknown>;
    const id = String(c.id ?? '').trim();
    const titleEn = trimTitle(c.titleEn);
    const titleAr = trimTitle(c.titleAr);
    if (!isSafeId(id) || !titleEn || !titleAr || seen.has(id)) continue;
    seen.add(id);
    const startSlots = Number(c.startSlots);
    channels.push({
      id,
      titleEn,
      titleAr,
      startSlots: Number.isFinite(startSlots) ? Math.min(5, Math.max(1, Math.floor(startSlots))) : 1,
    });
  }
  if (!channels.length) return fallback;
  const retiredChannels: ComplaintFormTemplate['retiredChannels'] = [];
  if (Array.isArray(rec.retiredChannels)) {
    for (const row of rec.retiredChannels.slice(0, 50)) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      if (!isSafeId(id) || seen.has(id) || retiredChannels.some((x) => x.id === id)) continue;
      retiredChannels.push({ id, titleEn: trimTitle(r.titleEn) || id, titleAr: trimTitle(r.titleAr) || id });
    }
  }
  return { v: 1, kind: CUSTOMER_COMPLAINT_KIND, channels, retiredChannels };
}

export function parseQcFormTemplate(kind: QcEditableFormKind, raw: unknown): QcFormTemplate {
  if (kind === CUSTOMER_COMPLAINT_KIND) return parseComplaintTemplate(raw);
  return parseInspectionTemplate(kind, raw);
}

export function addInspectionItem(
  template: InspectionFormTemplate,
  input: { sectionId: string; titleEn: string; titleAr: string }
): { ok: true; template: InspectionFormTemplate } | { ok: false; error: string } {
  const titleEn = trimTitle(input.titleEn);
  const titleAr = trimTitle(input.titleAr);
  if (!titleEn || !titleAr) return { ok: false, error: 'English and Arabic titles are required' };
  if (itemIds(template.sections).length >= QC_FORM_TEMPLATE_MAX_ITEMS) {
    return { ok: false, error: 'This form already has the maximum number of items' };
  }
  const sectionId = String(input.sectionId ?? '').trim();
  const idx = template.sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return { ok: false, error: 'Choose a section' };
  let id = newCustomId('u');
  const used = new Set(itemIds(template.sections));
  while (used.has(id) || !isSafeId(id)) id = newCustomId('u');
  const sections = template.sections.map((s, i) =>
    i === idx ? renumber({ ...s, items: [...s.items, { id, n: s.items.length + 1, titleEn, titleAr }] }) : s
  );
  return { ok: true, template: { ...template, sections } };
}

export function deleteInspectionItem(
  template: InspectionFormTemplate,
  itemId: string
): { ok: true; template: InspectionFormTemplate } | { ok: false; error: string } {
  const id = String(itemId ?? '').trim();
  if (itemIds(template.sections).length <= 1) return { ok: false, error: 'Keep at least one item on the form' };
  let found: QcTemplateItem | null = null;
  let sectionId = '';
  const sections = template.sections.map((s) => {
    const keep = s.items.filter((item) => {
      if (item.id !== id) return true;
      found = item;
      sectionId = s.id;
      return false;
    });
    return keep.length === s.items.length ? s : renumber({ ...s, items: keep });
  });
  if (!found) return { ok: false, error: 'That item is not on this form' };
  const retiredItems = [
    { id, sectionId, titleEn: found.titleEn, titleAr: found.titleAr },
    ...template.retiredItems.filter((r) => r.id !== id),
  ].slice(0, 200);
  return { ok: true, template: { ...template, sections, retiredItems } };
}

export function addComplaintChannel(
  template: ComplaintFormTemplate,
  input: { titleEn: string; titleAr: string }
): { ok: true; template: ComplaintFormTemplate } | { ok: false; error: string } {
  const titleEn = trimTitle(input.titleEn);
  const titleAr = trimTitle(input.titleAr);
  if (!titleEn || !titleAr) return { ok: false, error: 'English and Arabic titles are required' };
  if (template.channels.length >= QC_FORM_TEMPLATE_MAX_CHANNELS) {
    return { ok: false, error: 'This form already has the maximum number of sections' };
  }
  let id = newCustomId('ch');
  const used = new Set(template.channels.map((c) => c.id));
  while (used.has(id) || !isSafeId(id)) id = newCustomId('ch');
  return {
    ok: true,
    template: { ...template, channels: [...template.channels, { id, titleEn, titleAr, startSlots: 1 }] },
  };
}

export function deleteComplaintChannel(
  template: ComplaintFormTemplate,
  channelId: string
): { ok: true; template: ComplaintFormTemplate } | { ok: false; error: string } {
  const id = String(channelId ?? '').trim();
  if (template.channels.length <= 1) return { ok: false, error: 'Keep at least one complaint section' };
  const found = template.channels.find((c) => c.id === id);
  if (!found) return { ok: false, error: 'That section is not on this form' };
  return {
    ok: true,
    template: {
      ...template,
      channels: template.channels.filter((c) => c.id !== id),
      retiredChannels: [{ id, titleEn: found.titleEn, titleAr: found.titleAr }, ...template.retiredChannels].slice(
        0,
        50
      ),
    },
  };
}

function defaultItemCatalog(
  kind: InspectionFormTemplate['kind']
): Map<string, { titleEn: string; titleAr: string }> {
  const src = kind === WAREHOUSE_INSPECTION_KIND ? WAREHOUSE_INSPECTION_SECTIONS : BRANCH_INSPECTION_SECTIONS;
  const map = new Map<string, { titleEn: string; titleAr: string }>();
  for (const s of src) {
    for (const item of s.items) map.set(item.id, { titleEn: item.titleEn, titleAr: item.titleAr });
  }
  return map;
}

export function inspectionSectionsForDisplay(
  template: InspectionFormTemplate,
  answers: InspectionAnswers
): QcTemplateSection[] {
  const known = new Set(itemIds(template.sections));
  const leftover = Object.keys(answers).filter((id) => answers[id] && !known.has(id));
  if (!leftover.length) return template.sections;
  const catalog = defaultItemCatalog(template.kind);
  const extras: QcTemplateItem[] = leftover.map((id, i) => {
    const retired = template.retiredItems.find((r) => r.id === id);
    const def = catalog.get(id);
    return {
      id,
      n: i + 1,
      titleEn: retired?.titleEn || def?.titleEn || id,
      titleAr: retired?.titleAr || def?.titleAr || id,
    };
  });
  return [
    ...template.sections,
    { id: 'Z', titleEn: 'Previous items', titleAr: 'بنود سابقة', items: extras },
  ];
}

export async function loadQcFormTemplate(
  prisma: PrismaClient,
  kind: QcEditableFormKind
): Promise<QcFormTemplate> {
  const fallback = defaultQcFormTemplate(kind);
  try {
    const row = await prisma.qcAppConfig.findUnique({ where: { key: configKey(kind) } });
    if (!row?.value) return fallback;
    return parseQcFormTemplate(kind, JSON.parse(row.value) as unknown);
  } catch {
    return fallback;
  }
}

export async function loadAllQcFormTemplates(prisma: PrismaClient): Promise<{
  branch_inspection: InspectionFormTemplate;
  warehouse_inspection: InspectionFormTemplate;
  customer_complaint: ComplaintFormTemplate;
}> {
  const [branch, warehouse, complaint] = await Promise.all([
    loadQcFormTemplate(prisma, BRANCH_INSPECTION_KIND),
    loadQcFormTemplate(prisma, WAREHOUSE_INSPECTION_KIND),
    loadQcFormTemplate(prisma, CUSTOMER_COMPLAINT_KIND),
  ]);
  return {
    branch_inspection: branch as InspectionFormTemplate,
    warehouse_inspection: warehouse as InspectionFormTemplate,
    customer_complaint: complaint as ComplaintFormTemplate,
  };
}

export async function saveQcFormTemplate(prisma: PrismaClient, template: QcFormTemplate): Promise<void> {
  await prisma.qcAppConfig.upsert({
    where: { key: configKey(template.kind) },
    update: { value: JSON.stringify(template) },
    create: { key: configKey(template.kind), value: JSON.stringify(template) },
  });
}

export function isQcEditableFormKind(v: unknown): v is QcEditableFormKind {
  return v === BRANCH_INSPECTION_KIND || v === WAREHOUSE_INSPECTION_KIND || v === CUSTOMER_COMPLAINT_KIND;
}

export function asInspectionTemplate(t: QcFormTemplate): InspectionFormTemplate | null {
  if (t.kind === CUSTOMER_COMPLAINT_KIND) return null;
  return t;
}

export function asComplaintTemplate(t: QcFormTemplate): ComplaintFormTemplate | null {
  if (t.kind !== CUSTOMER_COMPLAINT_KIND) return null;
  return t;
}

export function publicQcFormCatalog(templates: {
  branch_inspection: InspectionFormTemplate;
  warehouse_inspection: InspectionFormTemplate;
  customer_complaint: ComplaintFormTemplate;
}) {
  return {
    forms: [
      { kind: BRANCH_INSPECTION_KIND, titleEn: 'Branch inspection', titleAr: 'فحص الفرع' },
      { kind: WAREHOUSE_INSPECTION_KIND, titleEn: 'Central kitchen – Warehouse', titleAr: 'المطبخ المركزي – المستودع' },
      { kind: CUSTOMER_COMPLAINT_KIND, titleEn: 'Complaints', titleAr: 'شكاوى' },
    ],
    templates,
  };
}

