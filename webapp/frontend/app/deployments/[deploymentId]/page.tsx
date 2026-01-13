import { DeploymentDetailView } from '@/components/deployments/DeploymentDetailView';

export default async function DeploymentDetailPage({
  params,
}: {
  params: Promise<{ deploymentId: string }>;
}) {
  const { deploymentId } = await params;
  const id = parseInt(deploymentId);

  if (isNaN(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-xl shadow-lg p-6">
          <p className="text-destructive">Invalid deployment ID</p>
        </div>
      </div>
    );
  }

  return <DeploymentDetailView deploymentId={id} />;
}
