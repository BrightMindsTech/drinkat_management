import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { getUserIdForEmployeeId } from '@/lib/employee-user';
import { notifyUser } from '@/lib/user-notify';
import { apiErrorResponse } from '@/lib/api-route-error';

async function deleteAssignmentAndSubmissions(assignmentId: string) {
  const submissions = await prisma.qcSubmission.findMany({
    where: { assignmentId },
    select: { id: true },
  });
  const submissionIds = submissions.map((s) => s.id);
  if (submissionIds.length > 0) {
    await prisma.submissionPhoto.deleteMany({
      where: { submissionId: { in: submissionIds } },
    });
    await prisma.qcSubmission.deleteMany({
      where: { assignmentId },
    });
  }
  await prisma.checklistAssignment.delete({ where: { id: assignmentId } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireQc();
    const role = normalizeUserRole(session.user.role);
    const { id } = await params;

    const assignment = await prisma.checklistAssignment.findUnique({
      where: { id },
      include: { checklist: true, employee: true },
    });
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (role === 'manager') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { employee: true },
      });
      if (!user?.employee) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const okReport = assignment.employee.reportsToEmployeeId === user.employee.id;
      const okChecklistBranch =
        !assignment.checklist.branchId || assignment.checklist.branchId === assignment.branchId;
      if (!okReport || !okChecklistBranch) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await deleteAssignmentAndSubmissions(id);

    const employeeUserId = await getUserIdForEmployeeId(assignment.employeeId);
    if (employeeUserId) {
      const href = '/dashboard/qc';
      try {
        await notifyUser(prisma, employeeUserId, {
          category: 'qc_assignment_removed',
          title: 'Checklist unassigned',
          body: `You are no longer assigned to "${assignment.checklist.name}".`,
          dataJson: JSON.stringify({
            type: 'qc_assignment_removed',
            checklistId: assignment.checklistId,
            href,
          }),
          push: {
            title: 'Checklist unassigned',
            body: `You are no longer assigned to "${assignment.checklist.name}".`,
            data: {
              type: 'qc_assignment_removed',
              url: href,
              checklistId: assignment.checklistId,
              assignmentId: assignment.id,
            },
          },
        });
      } catch (notifyErr) {
        console.error('[assignments/[id] DELETE] notify failed (assignment removed)', notifyErr);
      }
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[assignments/[id] DELETE] prisma', e.code, e.message);
      return Response.json(
        { error: 'Could not remove assignment. Try again or contact support.' },
        { status: 500 }
      );
    }
    return apiErrorResponse('assignments/[id] DELETE', e, 'Could not unassign');
  }
}
