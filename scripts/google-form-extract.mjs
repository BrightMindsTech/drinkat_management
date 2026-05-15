#!/usr/bin/env node
/**
 * CLI: extract public Google Form fields as JSON.
 * Usage: node scripts/google-form-extract.mjs <formUrlOrId> ...
 */

function extractJson(html) {
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
      if (depth === 0) return JSON.parse(html.slice(start, j + 1));
    }
  }
  return null;
}

function formIdFromInput(input) {
  const m = String(input).match(/\/e\/([^/]+)/);
  return m ? m[1] : input.trim();
}

function makeKey(label, index, used) {
  const trimmed = label.trim();
  const fixed = {
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

function parseGoogleFormData(data) {
  const title = (data[1][8] || '').trim();
  const desc = data[1][0] || undefined;
  const items = data[1][1] || [];
  const fields = [];
  const used = new Set();
  let idx = 0;
  for (const item of items) {
    if (!item || !item[1]) continue;
    idx++;
    const label = String(item[1]).replace(/\s+/g, ' ').trim();
    const typeId = item[3];
    const choiceBlock = item[4]?.[0]?.[1];
    const options = (choiceBlock || []).map((c) => c[0]).filter(Boolean);
    const key = makeKey(label, idx, used);

    if (typeId === 0) {
      fields.push({ key, label, type: 'text', required: true });
    } else if (typeId === 2 || typeId === 3) {
      const opts = options.map((o) => (o === 'yes' ? 'Yes' : o === 'No' ? 'No' : o));
      fields.push({ key, label, type: 'select', required: true, options: opts });
    } else if (typeId === 4) {
      fields.push({ key, label, type: 'checkbox', required: false });
    } else {
      fields.push({ key, label, type: 'text', required: false });
    }
  }
  return { title, description: desc || undefined, fields };
}

async function fetchGoogleForm(formId) {
  const res = await fetch(`https://docs.google.com/forms/d/e/${formId}/viewform`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const html = await res.text();
  const data = extractJson(html);
  if (!data) {
    return { ok: false, formId, error: 'Could not read form (sign-in required or not public)' };
  }
  const parsed = parseGoogleFormData(data);
  return { ok: true, formId, ...parsed };
}

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error('Usage: node scripts/google-form-extract.mjs <formUrlOrId> ...');
    process.exit(1);
  }
  const results = [];
  for (const input of inputs) {
    const formId = formIdFromInput(input);
    results.push(await fetchGoogleForm(formId));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
