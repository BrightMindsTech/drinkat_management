import { requireOwner } from '@/lib/session';
import { BARISTA_FORM_TEMPLATES } from '@/lib/baristaFormTemplates';
import { fetchGoogleForm } from '@/lib/google-form-extract';
import {
  getKitchenDepartmentIds,
  upsertKitchenFormTemplate,
  type KitchenTemplateInput,
} from '@/lib/importKitchenFormTemplate';

/** Additional barista Google Forms (imported live when publicly accessible). */
const EXTRA_GOOGLE_FORM_IDS = [
  '1FAIpQLScT2rgbB_qDYaXD5C8_-J6XJDqY_vhoWNgfBaUAIvxKfsg2Fw',
  '1FAIpQLScPWD0X38-pFW6ljHuKkgaVonid9oBCc-LhHqvKbv79p4sfNQ',
] as const;

export async function POST() {
  await requireOwner();

  const matchingDepartmentIds = await getKitchenDepartmentIds();

  let created = 0;
  let updated = 0;
  const skipped: { formId: string; error: string }[] = [];
  const imported: string[] = [];

  const bundled: KitchenTemplateInput[] = BARISTA_FORM_TEMPLATES.map((t) => ({
    title: t.title.trim(),
    description: t.description,
    fields: t.fields,
  }));

  for (const [index, tpl] of bundled.entries()) {
    const result = await upsertKitchenFormTemplate(tpl, 100 + index, matchingDepartmentIds);
    if (result === 'created') created += 1;
    else updated += 1;
    imported.push(tpl.title);
  }

  let extraIndex = bundled.length;
  for (const formId of EXTRA_GOOGLE_FORM_IDS) {
    if (BARISTA_FORM_TEMPLATES.some((t) => t.googleFormId === formId)) continue;

    try {
      const fetched = await fetchGoogleForm(formId);
      if (!fetched.ok) {
        skipped.push({ formId, error: fetched.error });
        continue;
      }
      const tpl: KitchenTemplateInput = {
        title: fetched.title.trim(),
        description: fetched.description,
        fields: fetched.fields,
      };
      const result = await upsertKitchenFormTemplate(tpl, 100 + extraIndex++, matchingDepartmentIds);
      if (result === 'created') created += 1;
      else updated += 1;
      imported.push(tpl.title);
    } catch (e) {
      skipped.push({
        formId,
        error: e instanceof Error ? e.message : 'fetch failed',
      });
    }
  }

  return Response.json({
    ok: true,
    created,
    updated,
    imported,
    skipped,
    hint:
      skipped.length > 0
        ? 'For forms that require sign-in: open each form in your browser, use “Import private Google Form” below, and paste the copied JSON.'
        : undefined,
  });
}
