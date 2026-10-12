import { IssueDetail } from '@/components/qc-ops/IssueDetail';

export const dynamic = 'force-dynamic';

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetail issueId={id} />;
}
