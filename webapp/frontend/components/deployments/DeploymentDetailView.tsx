'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  RefreshCw, 
  AlertCircle,
  Archive,
  ArchiveRestore,
  Edit,
  Copy,
  Check,
  ExternalLink,
  Users,
  Calendar
} from 'lucide-react';
import { Deployment, Run } from '@/lib/types/types';
import { useToast } from '@/hooks/use-toast';

interface DeploymentDetailViewProps {
  deploymentId: number;
}

export function DeploymentDetailView({ deploymentId }: DeploymentDetailViewProps) {
  const { toast } = useToast();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [token, setToken] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [runsStatusFilter, setRunsStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [copied, setCopied] = useState(false);

  const loadDeployment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [deploymentRes, runsRes, tokenRes] = await Promise.all([
        fetch(`/api/deployments/${deploymentId}`),
        fetch(`/api/deployments/${deploymentId}/runs`),
        fetch(`/api/deployments/${deploymentId}/invite`).catch(() => null),
      ]);

      if (!deploymentRes.ok) {
        if (deploymentRes.status === 404) {
          setError(`Deployment "${deploymentId}" not found`);
        } else {
          throw new Error(`Failed to load deployment: ${deploymentRes.statusText}`);
        }
        setLoading(false);
        return;
      }

      const deploymentData = await deploymentRes.json();
      setDeployment(deploymentData.deployment);
      setNewName(deploymentData.deployment.name || '');

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.runs || []);
      }

      if (tokenRes && tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setToken(tokenData.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading deployment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployment();
  }, [deploymentId]);

  const handleArchiveToggle = async () => {
    if (!deployment) return;

    const confirmMessage = deployment.is_active
      ? 'Are you sure you want to archive this deployment?'
      : 'Are you sure you want to unarchive this deployment?';

    if (!confirm(confirmMessage)) return;

    setArchiving(true);
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...deployment,
          is_active: !deployment.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update deployment');
      }

      await loadDeployment();
      toast({
        title: deployment.is_active ? 'Deployment archived' : 'Deployment unarchived',
        description: `Deployment has been ${deployment.is_active ? 'archived' : 'unarchived'}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update deployment',
        variant: 'destructive',
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleNameSave = async () => {
    if (!deployment) return;

    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...deployment,
          name: newName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update deployment name');
      }

      await loadDeployment();
      setEditingName(false);
      toast({
        title: 'Name updated',
        description: 'Deployment name has been updated',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update name',
        variant: 'destructive',
      });
    }
  };

  const handleCopyInviteLink = async () => {
    if (!token || !deployment) return;

    const botUsername = deployment.bot?.bot_name || 'bot';
    const inviteLink = `https://t.me/${botUsername}?start=${token.token}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Invite link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const createToken = async () => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_type: 'public',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create token');
      }

      const data = await response.json();
      setToken(data.token);
      toast({
        title: 'Invite link created',
        description: 'New invite link has been generated',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create invite link',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRuns = runs.filter((run) => {
    if (runsStatusFilter === 'active') return run.is_active && !run.is_ended;
    if (runsStatusFilter === 'completed') return run.is_ended;
    return true;
  });

  const activeRuns = runs.filter((r) => r.is_active && !r.is_ended).length;
  const completedRuns = runs.filter((r) => r.is_ended).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading deployment...</p>
        </div>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error loading deployment</h2>
          <p className="text-muted-foreground mb-4">{error || 'Deployment not found'}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={loadDeployment}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/deployments"
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Back to Deployments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = deployment.name || `${deployment.course?.title || deployment.course_id} — ${deployment.environment || 'prod'}`;
  const inviteLink = token ? `https://t.me/${deployment.bot?.bot_name || 'bot'}?start=${token.token}` : null;

  return (
    <div className="h-full bg-background p-6 editor-root">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/deployments"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deployments
          </Link>

          <div className="flex items-center justify-between">
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-3xl font-bold px-3 py-2 bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNameSave();
                      } else if (e.key === 'Escape') {
                        setEditingName(false);
                        setNewName(deployment.name || '');
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  {displayName}
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </h1>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Course:{' '}
                  {deployment.course ? (
                    <Link
                      href={`/course-editor/${deployment.course.course_id}`}
                      className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                    >
                      {deployment.course.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    deployment.course_id
                  )}
                </span>
                <span>
                  Bot: {deployment.bot ? `@${deployment.bot.bot_name}` : `Bot #${deployment.bot_id}`}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    deployment.is_active
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {deployment.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
            </div>
            <button
              onClick={handleArchiveToggle}
              disabled={archiving}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                deployment.is_active
                  ? 'border border-border hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {archiving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {deployment.is_active ? 'Archiving...' : 'Unarchiving...'}
                </>
              ) : deployment.is_active ? (
                <>
                  <Archive className="w-4 h-4" />
                  Archive
                </>
              ) : (
                <>
                  <ArchiveRestore className="w-4 h-4" />
                  Unarchive
                </>
              )}
            </button>
          </div>
        </div>

        {/* Invite Block */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Invite students</h2>
          {!token ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Для этого развертывания пока нет ссылки-приглашения.
              </p>
              <button
                onClick={createToken}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create invite link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Invite link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink || ''}
                    className="flex-1 px-4 py-2 text-sm bg-background rounded-lg border border-input font-mono"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy link
                      </>
                    )}
                  </button>
                  {inviteLink && (
                    <a
                      href={inviteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Runs Table */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students / Runs
            </h2>
            <div className="flex gap-4">
              <div className="bg-card border border-border rounded-lg px-4 py-2">
                <div className="text-xs text-muted-foreground">Active</div>
                <div className="text-lg font-bold text-foreground">{activeRuns}</div>
              </div>
              <div className="bg-card border border-border rounded-lg px-4 py-2">
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="text-lg font-bold text-foreground">{completedRuns}</div>
              </div>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="mb-4 flex gap-2 border-b border-border">
            <button
              onClick={() => setRunsStatusFilter('all')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                runsStatusFilter === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({runs.length})
            </button>
            <button
              onClick={() => setRunsStatusFilter('active')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                runsStatusFilter === 'active'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({activeRuns})
            </button>
            <button
              onClick={() => setRunsStatusFilter('completed')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                runsStatusFilter === 'completed'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completed ({completedRuns})
            </button>
          </div>

          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              {filteredRuns.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground mb-2">
                    Пока никто не начал этот курс по данному развертыванию.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Используйте ссылку-приглашение выше, чтобы пригласить студентов.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Finished
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredRuns.map((run) => (
                      <tr key={run.run_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {run.username ? `@${run.username}` : run.chat_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              run.is_ended
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : run.is_active
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {run.is_ended ? 'Completed' : run.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">{formatDate(run.date_inserted)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {run.ended_at ? formatDate(run.ended_at) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Deployment Info
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm text-foreground">{deployment.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Environment</dt>
              <dd className="mt-1 text-sm text-foreground">{deployment.environment || 'prod'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created at</dt>
              <dd className="mt-1 text-sm text-foreground">
                {new Date(deployment.created_at).toLocaleString('ru-RU')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Updated at</dt>
              <dd className="mt-1 text-sm text-foreground">
                {new Date(deployment.updated_at).toLocaleString('ru-RU')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
