/** Departments that should see kitchen-category forms (Deep Clean, etc.). */
export function departmentNameMatchesKitchenForm(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return false;
  return (
    n.includes('kitchen') ||
    n.includes('chef') ||
    n.includes('barista') ||
    n.includes('bar') ||
    n.includes('staff')
  );
}
