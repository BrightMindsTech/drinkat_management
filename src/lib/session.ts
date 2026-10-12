import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { userHasQcReviewerScope } from './qc-reviewer';
import { normalizeUserRole } from './formVisibility';
import { hasCapability, type Capability } from './permissions';

/** Thrown by require* gates. OpenNext does not map a thrown Response to HTTP status; use toResponse(). */
export class AuthHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthHttpError';
    this.status = status;
  }
  toResponse(): Response {
    return Response.json({ error: this.message }, { status: this.status });
  }
}

function deny(status: number, message: string): never {
  throw new AuthHttpError(status, message);
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) deny(401, 'Unauthorized');
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (normalizeUserRole(session.user.role) !== 'owner') deny(403, 'Forbidden');
  return session;
}

export async function requireQc() {
  const session = await requireSession();
  const r = normalizeUserRole(session.user.role);
  if (r === 'owner' || r === 'manager' || r === 'qc') return session;
  const ok = await userHasQcReviewerScope(prisma, session);
  if (!ok) deny(403, 'Forbidden');
  return session;
}

export async function requireManager() {
  const session = await requireSession();
  const r = normalizeUserRole(session.user.role);
  if (r !== 'manager') deny(403, 'Forbidden');
  return session;
}

export async function requireOwnerOrManager() {
  const session = await requireSession();
  const r = normalizeUserRole(session.user.role);
  if (r !== 'owner' && r !== 'manager') deny(403, 'Forbidden');
  return session;
}

/** Centralized capability gate (preferred for new routes over role-string checks). */
export async function requireCapability(capability: Capability) {
  const session = await requireSession();
  if (!hasCapability(session.user.role, capability)) deny(403, 'Forbidden');
  return session;
}

/** Owner/QC/manager (branch KPI), or HR reviewer (all employees). Does not unlock payroll. */
export async function requireKpiRosterViewer() {
  const session = await requireSession();
  if (hasCapability(session.user.role, 'kpi:viewBranch')) return session;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true },
  });
  if (!user?.hrKpiReviewer) deny(403, 'Forbidden');
  return session;
}

/** Owner, or a user the owner flagged as hrKpiReviewer. Does not unlock payroll/leave. */
export async function requireHrKpiReviewer() {
  const session = await requireSession();
  if (hasCapability(session.user.role, 'kpi:hrReview')) return session;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true },
  });
  if (!user?.hrKpiReviewer) deny(403, 'Forbidden');
  return session;
}

/** Owner, or flagged HR (Sara). Register/view/edit staff. Does not unlock payroll/leave. */
export async function sessionHasHrStaffAdmin(session: { user: { id: string; role?: string | null } }): Promise<boolean> {
  if (normalizeUserRole(session.user.role) === 'owner') return true;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true },
  });
  return Boolean(user?.hrKpiReviewer);
}

export async function requireHrStaffAdmin() {
  const session = await requireSession();
  if (!(await sessionHasHrStaffAdmin(session))) deny(403, 'Forbidden');
  return session;
}

/** Owner, or a user flagged photoOpsAdmin. Does not unlock payroll/leave. */
export async function requirePhotoOpsAdmin() {
  const session = await requireSession();
  if (normalizeUserRole(session.user.role) === 'owner') return session;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoOpsAdmin: true },
  });
  if (!user?.photoOpsAdmin) deny(403, 'Forbidden');
  return session;
}

/** Owner, manager, or a user flagged qcReportsInbox. Does not unlock payroll. */
export async function requireQcReportsInbox() {
  const session = await requireSession();
  const r = normalizeUserRole(session.user.role);
  if (r === 'owner' || r === 'manager' || r === 'qc') return session;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { qcReportsInbox: true },
  });
  if (!user?.qcReportsInbox) deny(403, 'Forbidden');
  return session;
}
