import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

/**
 * POST body: multipart form with file, or JSON { periodMonth, rows: [ { employeeId, amount } ] }
 * Or CSV text in body with periodMonth header and columns: employeeId or email, amount
 */
export async function POST(req: NextRequest) {
  await requireOwner();

  const contentType = req.headers.get('content-type') ?? '';
  let periodMonth: string;
  let entries: { employeeId: string; amount: number }[] = [];

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    periodMonth = (formData.get('periodMonth') as string) ?? '';
    if (!file || !periodMonth) return Response.json({ error: 'file and periodMonth required' }, { status: 400 });
    const text = await file.text();
    const parsed = parseCsvSalary(text);
    const allEmployees = await prisma.employee.findMany({ include: { user: { select: { email: true } } } });
    const emailToId = new Map<string, string>(
      allEmployees
        .map((e) => [e.user?.email ?? '', e.id] as [string, string])
        .filter(([email]) => email !== '')
    );
    for (const row of parsed) {
      const employeeId = row.employeeId ?? (row.email ? emailToId.get(row.email) : undefined);
      if (employeeId) entries.push({ employeeId, amount: row.amount });
    }
  } else if (contentType.includes('application/json')) {
    const body = (await req.json()) as {
      periodMonth?: string;
      rows?: unknown;
      entries?: unknown;
    };
    periodMonth = body.periodMonth ?? '';
    const rows = body.rows ?? body.entries;
    if (!periodMonth || !Array.isArray(rows)) return Response.json({ error: 'periodMonth and rows required' }, { status: 400 });
    entries = rows.map((r: { employeeId: string; amount: number }) => ({ employeeId: r.employeeId, amount: Number(r.amount) }));
  } else {
    return Response.json({ error: 'Content-Type must be multipart/form-data or application/json' }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({ where: { id: { in: entries.map((e) => e.employeeId) } } });
  const empIds = new Set(employees.map((e) => e.id));
  const valid = entries.filter((e) => empIds.has(e.employeeId));

  for (const { employeeId, amount } of valid) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp || emp.employmentType === 'part_time') continue;
    await prisma.salaryCopy.upsert({
      where: { employeeId_periodMonth: { employeeId, periodMonth } },
      update: { amount, source: 'upload' },
      create: { employeeId, branchId: emp.branchId, periodMonth, amount, source: 'upload' },
    });
  }

  const list = await prisma.salaryCopy.findMany({
    where: { periodMonth },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json({ uploaded: valid.length, salaryCopies: list });
}

function parseCsvSalary(csvText: string): { employeeId?: string; email?: string; amount: number }[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const idIdx = header.findIndex((h) => h === 'employeeid' || h === 'employee_id' || h === 'id');
  const emailIdx = header.findIndex((h) => h === 'email');
  const amountIdx = header.findIndex((h) => h === 'amount' || h === 'salary');
  if (amountIdx === -1) return [];

  const results: { employeeId?: string; email?: string; amount: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const amount = parseFloat(cells[amountIdx]);
    if (Number.isNaN(amount)) continue;
    if (idIdx >= 0 && cells[idIdx]) results.push({ employeeId: cells[idIdx], amount });
    else if (emailIdx >= 0 && cells[emailIdx]) results.push({ email: cells[emailIdx], amount });
  }
  return results;
}
