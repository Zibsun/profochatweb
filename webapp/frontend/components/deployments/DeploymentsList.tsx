'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  RefreshCw, 
  AlertCircle,
  Eye,
  Copy,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { Deployment, Course, Bot } from '@/lib/types/types';
import { useToast } from '@/hooks/use-toast';

interface DeploymentsListProps {
  deploymentId?: number;
}

export function DeploymentsList({ deploymentId }: DeploymentsListProps) {
  const { toast } = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [botFilter, setBotFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [deploymentsRes, coursesRes, botsRes] = await Promise.all([
        fetch('/api/deployments'),
        fetch('/api/courses'),
        fetch('/api/bots'),
      ]);

      if (!deploymentsRes.ok) {
        throw new Error(`Failed to load deployments: ${deploymentsRes.statusText}`);
      }

      const deploymentsData = await deploymentsRes.json();
      setDeployments(deploymentsData.deployments || []);

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }

      if (botsRes.ok) {
        const botsData = await botsRes.json();
        setBots(botsData.bots || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyInviteLink = async (deploymentId: number) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/invite`);
      if (!response.ok) {
        throw new Error('Failed to get invite link');
      }

      const data = await response.json();
      const token = data.token;
      const deployment = deployments.find(d => d.deployment_id === deploymentId);
      const botUsername = deployment?.bot?.bot_name || 'bot';

      const inviteLink = `https://t.me/${botUsername}?start=${token.token}`;

      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Link copied',
        description: 'Invite link copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy invite link',
        variant: 'destructive',
      });
    }
  };

  const handleToggleArchive = async (deploymentId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update deployment');
      }

      await loadData();
      toast({
        title: currentStatus ? 'Deployment archived' : 'Deployment unarchived',
        description: `Deployment has been ${currentStatus ? 'archived' : 'unarchived'}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update deployment',
        variant: 'destructive',
      });
    }
  };

  // Filter deployments
  const filteredDeployments = deployments.filter((deployment) => {
    if (courseFilter !== 'all' && deployment.course_id !== courseFilter) return false;
    if (botFilter !== 'all' && deployment.bot_id !== parseInt(botFilter)) return false;
    if (statusFilter === 'active' && !deployment.is_active) return false;
    if (statusFilter === 'archived' && deployment.is_active) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = deployment.name?.toLowerCase().includes(query);
      const matchesCourse = deployment.course?.title.toLowerCase().includes(query);
      const matchesBot = deployment.bot?.bot_name.toLowerCase().includes(query);
      if (!matchesName && !matchesCourse && !matchesBot) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading deployments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error loading deployments</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 editor-root">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deployments</h1>
            <p className="text-muted-foreground mt-1">Управление развертываниями курсов</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Link
              href="/deployments/new"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Deployment
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-card rounded-xl shadow-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Course filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Course
              </label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              >
                <option value="all">All</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Bot filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Bot
              </label>
              <select
                value={botFilter}
                onChange={(e) => setBotFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              >
                <option value="all">All</option>
                {bots.map((bot) => (
                  <option key={bot.bot_id} value={bot.bot_id.toString()}>
                    @{bot.bot_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deployments Table */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-muted-foreground mb-4">
                        {deployments.length === 0 ? (
                          <>
                            <p className="mb-2">У вас еще нет развертываний.</p>
                            <p className="text-sm">Создайте первое, выбрав курс и бота.</p>
                          </>
                        ) : (
                          <p>No deployments match the current filters.</p>
                        )}
                      </div>
                      {deployments.length === 0 && (
                        <Link
                          href="/deployments/new"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          New Deployment
                        </Link>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDeployments.map((deployment) => (
                    <tr 
                      key={deployment.deployment_id} 
                      className={`hover:bg-muted/30 transition-colors ${
                        deploymentId === deployment.deployment_id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {deployment.name || deployment.environment || 'Unnamed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {deployment.course ? (
                          <Link
                            href={`/course-editor/${deployment.course.course_id}`}
                            className="text-sm text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                          >
                            {deployment.course.title}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {deployment.course_id}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {deployment.bot ? `@${deployment.bot.bot_name}` : `Bot #${deployment.bot_id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {deployment.stats?.active_runs || 0} active / {deployment.stats?.completed_runs || 0} completed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deployment.is_active
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          {deployment.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/deployments/${deployment.deployment_id}`}
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleCopyInviteLink(deployment.deployment_id)}
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted"
                            title="Copy invite link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(deployment.deployment_id, deployment.is_active)}
                            className={`${
                              deployment.is_active
                                ? 'text-muted-foreground hover:text-foreground'
                                : 'text-primary hover:text-primary/80'
                            } flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted`}
                            title={deployment.is_active ? 'Archive' : 'Unarchive'}
                          >
                            {deployment.is_active ? (
                              <Archive className="w-4 h-4" />
                            ) : (
                              <ArchiveRestore className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
