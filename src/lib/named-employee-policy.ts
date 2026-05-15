/** HR-identified individuals for app-wide exceptions (clock-out rules, form visibility, etc.). */

export function isZainBadarneh(emp: { name?: string | null }, userEmail?: string | null): boolean {
  const email = userEmail?.trim().toLowerCase();
  if (email === 'zain@drinkat.com') return true;
  const normalized = String(emp.name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!normalized) return false;
  return normalized === 'zain badarneh';
}
