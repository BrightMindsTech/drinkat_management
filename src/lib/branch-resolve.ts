import { prisma } from '@/lib/prisma';

/** Match a branch id from a free-text branch name (QC visit forms). */
export async function resolveBranchIdByName(branchName: string | undefined | null): Promise<string | null> {
  const name = (branchName ?? '').trim();
  if (!name) return null;

  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const lower = name.toLowerCase();

  const exact = branches.find((b) => b.name.trim().toLowerCase() === lower);
  if (exact) return exact.id;

  const partial = branches.find((b) => {
    const bn = b.name.trim().toLowerCase();
    return bn.includes(lower) || lower.includes(bn);
  });
  return partial?.id ?? null;
}
