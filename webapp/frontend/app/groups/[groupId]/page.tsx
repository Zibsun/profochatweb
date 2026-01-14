import { GroupDetailView } from '@/components/groups/GroupDetailView';

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const id = parseInt(groupId);

  if (isNaN(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-xl shadow-lg p-6">
          <p className="text-destructive">Invalid group ID</p>
        </div>
      </div>
    );
  }

  return <GroupDetailView groupId={id} />;
}
