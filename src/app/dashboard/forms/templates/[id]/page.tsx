import { TemplateVersions } from '@/components/qc-ops/TemplateVersions';

export const dynamic = 'force-dynamic';

export default async function TemplateVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateVersions templateId={id} />;
}
