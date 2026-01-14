'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { BotInspector } from './BotInspector';
import { AttachCourseModal } from './AttachCourseModal';
import { BotDetails } from './types';
import { useToast } from '@/hooks/use-toast';

interface BotEditPageProps {
  botId: string;
}

export function BotEditPage({ botId }: BotEditPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [botDetails, setBotDetails] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttachCourseModalOpen, setIsAttachCourseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load bot details
  useEffect(() => {
    let cancelled = false;

    const loadBotDetails = async () => {
      try {
        setLoading(true);
        console.log('Loading bot details for:', botId);

        // Fetch bot details from API
        const botResponse = await fetch(`/api/bots/${botId}`);
        if (!botResponse.ok) {
          if (botResponse.status === 404) {
            toast({
              title: 'Bot not found',
              description: `Bot with ID "${botId}" not found`,
              variant: 'destructive',
            });
            router.push('/bots');
            return;
          }
          throw new Error('Failed to load bot details');
        }

        const botData = await botResponse.json();

        // Check if request was cancelled
        if (cancelled) return;

        // Fetch connected courses
        let connectedCourses: Array<{ id: string; title: string }> = [];
        try {
          const coursesResponse = await fetch(`/api/bots/${botId}/courses`);
          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            connectedCourses = coursesData.courses || [];
          }
        } catch (error) {
          console.warn('Failed to load connected courses:', error);
        }

        // Check again after loading courses
        if (cancelled) return;

        // Form Telegram info from bot data
        const botDisplayName = botData.display_name || botData.bot_name;
        const botUsername = botData.bot_name.startsWith('@')
          ? botData.bot_name
          : `@${botData.bot_name}`;

        const telegramInfo = {
          avatar: undefined, // Will be loaded from Telegram API if available
          bot_username: botUsername,
          display_name: botDisplayName,
          about: botData.description || undefined,
          short_about: undefined, // Not available from bot table
          commands: [], // Will be loaded from Telegram API if available
        };

        const newBotDetails: BotDetails = {
          id: botId,
          bot_name: botData.bot_name,
          display_name: botDisplayName,
          telegram_info: telegramInfo,
          internal_settings: {
            token_masked: botData.bot_token || '••••••••••••••••••',
            active: botData.is_active,
          },
          connected_courses: connectedCourses,
        };

        console.log('Setting bot details:', newBotDetails);
        setBotDetails(newBotDetails);
      } catch (error) {
        console.error('Error loading bot details:', error);
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load bot details',
            variant: 'destructive',
          });
          setBotDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBotDetails();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [botId, router, toast]);

  const handleToggleActive = async (active: boolean) => {
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bot status');
      }

      // Update local state
      if (botDetails) {
        setBotDetails({
          ...botDetails,
          internal_settings: {
            ...botDetails.internal_settings!,
            active,
          },
        });
      }

      toast({
        title: 'Bot updated',
        description: `Bot has been ${active ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update bot status',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/test-connection`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Connection test failed');
      }

      const data = await response.json();

      return {
        botApi: data.bot_api === 'OK' ? 'OK' : 'ERROR',
        webhook: data.webhook === 'OK' ? 'OK' : 'ERROR',
        errors: {
          botApi: data.bot_api === 'OK' ? null : data.bot_api_error || 'Unknown error',
          webhook: data.webhook === 'OK' ? null : data.webhook_error || 'Unknown error',
        },
      };
    } catch (error) {
      return {
        botApi: 'ERROR' as const,
        webhook: 'ERROR' as const,
        errors: {
          botApi: error instanceof Error ? error.message : 'Unknown error',
          webhook: null,
        },
      };
    }
  };

  const handleAddCourse = () => {
    setIsAttachCourseModalOpen(true);
  };

  const handleAttachCourses = async (courseIds: string[]) => {
    try {
      // Attach courses to bot
      for (const courseId of courseIds) {
        const response = await fetch(`/api/bots/${botId}/courses/${courseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            environment: 'prod',
            is_active: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to attach course ${courseId}`);
        }
      }

      toast({
        title: 'Courses attached',
        description: `${courseIds.length} course(s) have been attached to the bot`,
      });

      setIsAttachCourseModalOpen(false);

      // Reload bot details
      const botResponse = await fetch(`/api/bots/${botId}`);
      if (botResponse.ok) {
        const botData = await botResponse.json();
        const coursesResponse = await fetch(`/api/bots/${botId}/courses`);
        let connectedCourses: Array<{ id: string; title: string }> = [];
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          connectedCourses = coursesData.courses || [];
        }

        const botDisplayName = botData.display_name || botData.bot_name;
        const botUsername = botData.bot_name.startsWith('@')
          ? botData.bot_name
          : `@${botData.bot_name}`;

        setBotDetails({
          id: botId,
          bot_name: botData.bot_name,
          display_name: botDisplayName,
          telegram_info: {
            avatar: undefined,
            bot_username: botUsername,
            display_name: botDisplayName,
            about: botData.description || undefined,
            short_about: undefined,
            commands: [],
          },
          internal_settings: {
            token_masked: botData.bot_token || '••••••••••••••••••',
            active: botData.is_active,
          },
          connected_courses: connectedCourses,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to attach courses',
        variant: 'destructive',
      });
    }
  };

  const reloadConnectedCourses = async () => {
    try {
      const coursesResponse = await fetch(`/api/bots/${botId}/courses`);
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        const connectedCourses = coursesData.courses || [];

        if (botDetails) {
          setBotDetails({
            ...botDetails,
            connected_courses: connectedCourses,
          });
        }
      }
    } catch (error) {
      console.error('Failed to reload connected courses:', error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete bot');
      }

      toast({
        title: 'Bot deleted',
        description: `Bot "${botDetails?.display_name || botDetails?.bot_name}" has been deleted successfully.`,
      });

      // Redirect to bots list
      router.push('/bots');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete bot',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (!botDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Bot not found</h2>
          <p className="text-muted-foreground mb-4">The bot you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/bots"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bots
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/bots"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Back to bots list"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {botDetails.display_name || botDetails.bot_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {botDetails.telegram_info?.bot_username}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Inspector */}
      <div className="flex-1 overflow-hidden">
        <BotInspector
          key={botId}
          botDetails={botDetails}
          loading={false}
          onToggleActive={handleToggleActive}
          onTestConnection={handleTestConnection}
          onAddCourse={handleAddCourse}
          onCourseRemoved={reloadConnectedCourses}
        />
      </div>

      {/* Delete Button Section */}
      <div className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-end">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Bot
            </button>
          </div>
        </div>
      </div>

      {/* Attach Course Modal */}
      {isAttachCourseModalOpen && (
        <AttachCourseModal
          isOpen={isAttachCourseModalOpen}
          botId={botId}
          connectedCourseIds={(botDetails?.connected_courses || []).map((c) => c.id)}
          onClose={() => setIsAttachCourseModalOpen(false)}
          onAttach={handleAttachCourses}
          onCreateCourse={() => {
            setIsAttachCourseModalOpen(false);
            router.push('/course-editor');
            toast({
              title: 'Create Course',
              description: 'Redirecting to course creation page',
            });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl w-[90%] max-w-md p-6 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground mb-2">Delete Bot</h2>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete this bot? This action cannot be undone.
                </p>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the bot and all associated course deployments.
                </p>
              </div>
              {!isDeleting && (
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
