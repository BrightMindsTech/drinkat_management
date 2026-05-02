/** HR-identified individuals for app-wide exceptions (clock-out rules, form visibility, etc.). */

export function isZainBadarneh(emp: { name: string }, userEmail?: string | null): boolean {
  const email = userEmail?.trim().toLowerCase();
  if (email === 'zain@drinkat.com') return true;
  const normalized = emp.name.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalized === 'zain badarneh';
}
