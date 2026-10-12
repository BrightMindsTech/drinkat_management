import { GuidedInspection } from '@/components/qc-ops/GuidedInspection';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuidedInspection taskId={id} />;
}
