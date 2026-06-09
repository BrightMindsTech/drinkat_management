import { formTemplateFieldsSchema, type FormFieldDef } from '@/lib/formTemplate';

/** Run in the browser console while viewing a Google Form you can open (signed in). */
export const GOOGLE_FORM_BROWSER_EXTRACT_SCRIPT = `(() => {
  const html = document.documentElement.innerHTML;
  const marker = 'FB_PUBLIC_LOAD_DATA_ = ';
  const i = html.indexOf(marker);
  if (i < 0) { alert('Open the Google Form page first, then run this again.'); return; }
  let start = i + marker.length;
  if (html[start] !== '[') { alert('Form data not found.'); return; }
  let depth = 0;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        const text = html.slice(start, j + 1);
        const done = () => alert('Copied! Paste it in Drinkat → Forms → Import private Google Form.');
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => prompt('Copy this JSON:', text));
        else prompt('Copy this JSON:', text);
        return;
      }
    }
  }
  alert('Could not extract form data.');
})();`;

export function extractGoogleFormPayloadFromHtml(html: string): unknown[] | null {
  return extractJson(html);
}

function extractJson(html: string): unknown[] | null {
  const marker = 'FB_PUBLIC_LOAD_DATA_ = ';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  let start = i + marker.length;
  if (html[start] !== '[') return null;
  let depth = 0;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, j + 1)) as unknown[];
    }
  }
  return null;
}

export function googleFormIdFromUrl(input: string): string {
  const m = String(input).match(/\/e\/([^/]+)/);
  return m ? m[1] : input.trim();
}

function makeFieldKey(label: string, index: number, used: Set<string>): string {
  const trimmed = label.trim();
  const fixed: Record<string, string> = {
    'Branch Name': 'branch_name',
    'Barista Name - اسم الباريستا': 'barista_name',
    'Barista Name - اسم الباريستا(المستلم)': 'barista_name_receiving',
    'Barista Name - اسم الباريستا(صاحب الشفت)': 'barista_name_shift_owner',
  };
  if (fixed[trimmed]) {
    let k = fixed[trimmed];
    if (used.has(k)) k = `${k}_${index}`;
    used.add(k);
    return k;
  }
  let base = trimmed
    .replace(/[\u200f\u200e]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 45);
  if (!base) base = `q_${String(index).padStart(2, '0')}`;
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  return key;
}

type RawFormItem = [
  number,
  string,
  unknown,
  number,
  unknown,
  ...unknown[],
];

function choiceOptionsFromItem(item: RawFormItem): string[] {
  const block = item[4];
  if (!block || !Array.isArray(block)) return [];
  const inner = block[0];
  if (!Array.isArray(inner) || inner.length < 2) return [];
  const choices = inner[1];
  if (!Array.isArray(choices)) return [];
  return choices
    .map((c) => (Array.isArray(c) ? c[0] : null))
    .filter((o): o is string => typeof o === 'string' && o.length > 0);
}

function normalizeSelectOptions(options: string[]): string[] {
  const opts = options.map((o) => (o === 'yes' ? 'Yes' : o === 'no' ? 'No' : o));
  return opts.length > 0 ? opts : ['Yes', 'No'];
}

export function parseGoogleFormPayload(data: unknown[]): {
  title: string;
  description?: string;
  fields: FormFieldDef[];
} {
  const row = data[1] as unknown[] | undefined;
  if (!row) {
    return { title: '', fields: [] };
  }
  const title = String(row[8] ?? row[10] ?? '').trim();
  const desc = row[0] ? String(row[0]) : undefined;
  const rawItems = row[1];
  const items = Array.isArray(rawItems) ? (rawItems as RawFormItem[]) : [];
  const fields: FormFieldDef[] = [];
  const used = new Set<string>();
  let idx = 0;

  for (const item of items) {
    if (!item || !item[1]) continue;
    const label = String(item[1]).replace(/\s+/g, ' ').trim();
    const typeId = item[3];
    if (typeId === 1) continue;
    idx++;
    const options = choiceOptionsFromItem(item);
    const key = makeFieldKey(label, idx, used);

    if (typeId === 0) {
      fields.push({ key, label, type: 'text', required: true });
    } else if (typeId === 2 || typeId === 3) {
      fields.push({
        key,
        label,
        type: 'select',
        required: true,
        options: normalizeSelectOptions(options),
      });
    } else if (typeId === 4) {
      fields.push({ key, label, type: 'checkbox', required: false });
    } else if (typeId === 9) {
      fields.push({ key, label, type: 'date', required: false });
    } else if (typeId === 13) {
      fields.push({ key, label, type: 'photo', required: false });
    } else {
      fields.push({ key, label, type: 'text', required: false });
    }
  }

  return { title, description: desc, fields };
}

export type ParseGoogleFormPasteResult =
  | { ok: true; title: string; description?: string; fields: FormFieldDef[] }
  | { ok: false; error: string };

function validateParsedGoogleForm(parsed: {
  title: string;
  description?: string;
  fields: FormFieldDef[];
}): ParseGoogleFormPasteResult {
  if (!parsed.title) return { ok: false, error: 'Form title missing in pasted data.' };
  if (parsed.fields.length === 0) return { ok: false, error: 'No questions found in pasted data.' };
  try {
    const fields = formTemplateFieldsSchema.parse(parsed.fields);
    return { ok: true, title: parsed.title, description: parsed.description, fields };
  } catch {
    return { ok: false, error: 'Imported fields are invalid. Try copying the form JSON again.' };
  }
}

export function parseGoogleFormPaste(raw: string): ParseGoogleFormPasteResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste is empty.' };
  }

  if (trimmed.includes('FB_PUBLIC_LOAD_DATA_')) {
    const data = extractJson(trimmed);
    if (data) {
      try {
        const parsed = parseGoogleFormPayload(data);
        const validated = validateParsedGoogleForm(parsed);
        if (!validated.ok) return validated;
        return { ok: true, ...validated };
      } catch {
        return { ok: false, error: 'Could not read questions from pasted form data.' };
      }
    }
  }

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (Array.isArray(json) && json[1]) {
      try {
        const parsed = parseGoogleFormPayload(json);
        const validated = validateParsedGoogleForm(parsed);
        if (!validated.ok) return validated;
        return { ok: true, ...validated };
      } catch {
        return { ok: false, error: 'Could not read questions from pasted form data.' };
      }
    }
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const o = json as Record<string, unknown>;
      if (typeof o.title === 'string' && Array.isArray(o.fields)) {
        const fields = formTemplateFieldsSchema.parse(o.fields);
        const title = o.title.trim();
        if (!title) return { ok: false, error: 'Form title is required.' };
        return {
          ok: true,
          title,
          description: typeof o.description === 'string' ? o.description : undefined,
          fields,
        };
      }
    }
  } catch {
    return {
      ok: false,
      error:
        'Could not parse paste. On the Google Form page, open the browser console (F12), run the copy script, then paste here.',
    };
  }

  return {
    ok: false,
    error:
      'Unrecognized format. Use the browser copy script on the Google Form page, or paste the JSON array from FB_PUBLIC_LOAD_DATA_.',
  };
}

export type FetchGoogleFormResult =
  | { ok: true; formId: string; title: string; description?: string; fields: FormFieldDef[] }
  | { ok: false; formId: string; error: string };

export async function fetchGoogleForm(formId: string): Promise<FetchGoogleFormResult> {
  const res = await fetch(`https://docs.google.com/forms/d/e/${formId}/viewform`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const html = await res.text();
  const data = extractJson(html);
  if (!data) {
    return {
      ok: false,
      formId,
      error: 'Could not read form (requires sign-in or not shared publicly)',
    };
  }
  const parsed = parseGoogleFormPayload(data);
  return { ok: true, formId, ...parsed };
}
