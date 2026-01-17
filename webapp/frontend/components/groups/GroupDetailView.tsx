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
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { Group, Run, InviteLink } from '@/lib/types/types';
import { useToast } from '@/hooks/use-toast';
import { ScheduleTab } from './ScheduleTab';
import { StudentsTab } from './StudentsTab';

interface GroupDetailViewProps {
  groupId: number;
}

export function GroupDetailView({ groupId }: GroupDetailViewProps) {
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [runsStatusFilter, setRunsStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'students'>('overview');

  const loadGroup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupRes, runsRes, invitesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/runs`),
        fetch(`/api/groups/${groupId}/invites`).catch(() => null),
      ]);

      if (!groupRes.ok) {
        if (groupRes.status === 404) {
          setError(`Group "${groupId}" not found`);
        } else {
          throw new Error(`Failed to load group: ${groupRes.statusText}`);
        }
        setLoading(false);
        return;
      }

      const groupData = await groupRes.json();
      setGroup(groupData.group);
      setNewName(groupData.group.name || '');

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.runs || []);
      }

      if (invitesRes && invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInviteLinks(invitesData.invite_links || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading group:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const handleArchiveToggle = async () => {
    if (!group) return;

    const confirmMessage = group.is_active
      ? 'Are you sure you want to archive this group?'
      : 'Are you sure you want to unarchive this group?';

    if (!confirm(confirmMessage)) return;

    setArchiving(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !group.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update group');
      }

      await loadGroup();
      toast({
        title: group.is_active ? 'Group archived' : 'Group unarchived',
        description: `Group has been ${group.is_active ? 'archived' : 'unarchived'}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update group',
        variant: 'destructive',
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleNameSave = async () => {
    if (!group) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update group name');
      }

      await loadGroup();
      setEditingName(false);
      toast({
        title: 'Name updated',
        description: 'Group name has been updated',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update name',
        variant: 'destructive',
      });
    }
  };

  const handleCopyInviteLink = (inviteUrl: string) => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: 'Link copied',
      description: 'Invite link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const createInviteLink = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create invite link');
      }

      await loadGroup();
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
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error loading group</h2>
          <p className="text-muted-foreground mb-4">{error || 'Group not found'}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={loadGroup}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/groups"
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = group.name || 'Unnamed Group';
  const firstInviteLink = inviteLinks.length > 0 ? inviteLinks[0] : null;

  return (
    <div className="h-full bg-background p-6 editor-root">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
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
                        setNewName(group.name || '');
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
                  {group.course ? (
                    <Link
                      href={`/course-editor/${group.course.course_id}`}
                      className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                    >
                      {group.course.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    `Course #${group.course_id}`
                  )}
                </span>
                <span>
                  Bot: {group.bot ? `@${group.bot.bot_name}` : `Bot #${group.bot_id}`}
                </span>
                {group.schedule && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Schedule: {group.schedule.schedule_type}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    group.is_active
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {group.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
            </div>
            <button
              onClick={handleArchiveToggle}
              disabled={archiving}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                group.is_active
                  ? 'border border-border hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {archiving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {group.is_active ? 'Archiving...' : 'Unarchiving...'}
                </>
              ) : group.is_active ? (
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

        {/* Tabs */}
        {group && (
          <div className="mb-6 border-b border-border">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'schedule'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Schedule
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'students'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Students
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {group && activeTab === 'schedule' ? (
          <ScheduleTab groupId={groupId} courseCode={group.course?.course_code || String(group.course_id)} />
        ) : group && activeTab === 'students' ? (
          <StudentsTab groupId={groupId} />
        ) : group ? (
          <>
            {/* Invite Links Block */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Invite Links
            </h2>
            <button
              onClick={createInviteLink}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Create Invite Link
            </button>
          </div>
          {inviteLinks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                This group has no invite links yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inviteLinks.map((link) => (
                <div key={link.invite_link_id} className="bg-background rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-foreground">Token: {link.token}</span>
                        {link.max_uses && (
                          <span className="text-xs text-muted-foreground">
                            ({link.current_uses}/{link.max_uses} uses)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={link.invite_url || ''}
                        className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input font-mono"
                      />
                    </div>
                    <button
                      onClick={() => handleCopyInviteLink(link.invite_url || '')}
                      className="ml-3 px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
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
                    No students have started this course in this group yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use the invite link above to invite students.
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

        {/* Group Info */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Group Info
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm text-foreground">{group.name || '—'}</dd>
            </div>
            {group.description && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                <dd className="mt-1 text-sm text-foreground">{group.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created at</dt>
              <dd className="mt-1 text-sm text-foreground">
                {new Date(group.created_at).toLocaleString('ru-RU')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Updated at</dt>
              <dd className="mt-1 text-sm text-foreground">
                {new Date(group.updated_at).toLocaleString('ru-RU')}
              </dd>
            </div>
          </dl>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
