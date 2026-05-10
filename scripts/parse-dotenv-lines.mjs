/**
 * Parse KEY=value lines (no JSON). Supports # comments and empty lines.
 * @param {string} raw
 * @returns {Map<string, string>}
 */
export function parseDotEnvLines(raw) {
  const m = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    m.set(k, v);
  }
  return m;
}

/**
 * @param {Map<string, string>} map
 * @param {string[]} keyOrder preferred key order (others alphabetically after)
 * @returns {string}
 */
export function serializeDotEnv(map, keyOrder = []) {
  const seen = new Set();
  const lines = [];
  for (const k of keyOrder) {
    if (!map.has(k)) continue;
    lines.push(`${k}=${map.get(k)}`);
    seen.add(k);
  }
  const rest = [...map.keys()].filter((k) => !seen.has(k)).sort();
  for (const k of rest) {
    lines.push(`${k}=${map.get(k)}`);
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
}
