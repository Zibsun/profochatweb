"use client"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BotsList } from "./BotsList";
import { BotInspector } from "./BotInspector";
import { AddBotModal } from "./AddBotModal";
import { AttachCourseModal } from "./AttachCourseModal";
import { Bot } from "@/lib/types/types";
import { BotDetails } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, X, AlertCircle } from "lucide-react";

// Mock data for development
const mockTelegramInfo = {
  avatar: undefined, // Will be loaded from Telegram API if available
  bot_username: "@main_bot",
  display_name: "Main Bot",
  about: "Training bot for onboarding",
  short_about: "Learn basics fast",
  commands: [
    { command: "/start", desc: "Launch bot" },
    { command: "/help", desc: "Show help" },
  ],
};

const mockInternalSettings = {
  token_masked: "••••••••••••••••••",
  token_unmasked: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  active: true,
};

const mockConnectedCourses = [
  { id: "greek_a1", title: "Greek A1" },
  { id: "sales_101", title: "Sales 101" },
  { id: "hr_onboard", title: "HR Onboard" },
];

interface BotManagementProps {
  initialBotId?: string;
}

export function BotManagement({ initialBotId }: BotManagementProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(initialBotId || null);
  const [botDetails, setBotDetails] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBotDetails, setLoadingBotDetails] = useState(false);
  const [isAddBotModalOpen, setIsAddBotModalOpen] = useState(false);
  const [isAttachCourseModalOpen, setIsAttachCourseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Sync selectedBotId with URL on initial load
  useEffect(() => {
    const botIdFromUrl = searchParams.get('botId');
    if (botIdFromUrl && botIdFromUrl !== selectedBotId) {
      setSelectedBotId(botIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load bots list
  useEffect(() => {
    const loadBots = async () => {
      try {
        const response = await fetch("/api/bots");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to load bots");
        }
        const data = await response.json();
        setBots(data.bots || []);
        
        // Auto-select bot from URL or first bot if available and none selected
        if (data.bots && data.bots.length > 0) {
          const botIdFromUrl = searchParams.get('botId');
          if (botIdFromUrl) {
            const botExists = data.bots.some((b: Bot) => String(b.bot_id) === botIdFromUrl);
            if (botExists && !selectedBotId) {
              setSelectedBotId(botIdFromUrl);
            } else if (!botExists) {
              // Bot from URL doesn't exist, select first bot
              setSelectedBotId(String(data.bots[0].bot_id));
            }
          } else if (!selectedBotId) {
            setSelectedBotId(String(data.bots[0].bot_id));
          }
        }
      } catch (error) {
        console.error("Error loading bots:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load bots",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load bot details when selected
  useEffect(() => {
    if (!selectedBotId) {
      setBotDetails(null);
      setLoadingBotDetails(false);
      return;
    }

    // Сбрасываем детали перед загрузкой новых данных
    setBotDetails(null);
    setLoadingBotDetails(true);

    let cancelled = false;

    const loadBotDetails = async () => {
      try {
        console.log('Loading bot details for:', selectedBotId);
        
        // Fetch bot details from API
        const botResponse = await fetch(`/api/bots/${selectedBotId}`);
        if (!botResponse.ok) {
          throw new Error("Failed to load bot details");
        }

        const botData = await botResponse.json();
        
        // Проверяем, не был ли запрос отменен
        if (cancelled) return;

        // Fetch connected courses
        let connectedCourses: Array<{ id: string; title: string }> = [];
        try {
          const coursesResponse = await fetch(`/api/bots/${selectedBotId}/courses`);
          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            connectedCourses = coursesData.courses || [];
          }
        } catch (error) {
          console.warn("Failed to load connected courses:", error);
        }

        // Проверяем еще раз после загрузки курсов
        if (cancelled) return;

        // Формируем Telegram info на основе данных бота
        // TODO: Fetch Telegram info from API if endpoint exists
        // For now, construct from bot data
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
          id: selectedBotId,
          bot_name: botData.bot_name,
          display_name: botDisplayName,
          telegram_info: telegramInfo,
          internal_settings: {
            token_masked: botData.bot_token || "••••••••••••••••••",
            active: botData.is_active,
          },
          connected_courses: connectedCourses,
        };

        console.log('Setting bot details:', newBotDetails);
        setBotDetails(newBotDetails);
      } catch (error) {
        console.error("Error loading bot details:", error);
        if (!cancelled) {
          toast({
            title: "Error",
            description: "Failed to load bot details",
            variant: "destructive",
          });
          setBotDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingBotDetails(false);
        }
      }
    };

    loadBotDetails();

    // Cleanup function для отмены запроса при изменении selectedBotId
    return () => {
      cancelled = true;
    };
  }, [selectedBotId]);

  const handleSelectBot = (botId: string) => {
    // Принудительно сбрасываем детали перед переключением
    setBotDetails(null);
    setLoadingBotDetails(true);
    setSelectedBotId(botId);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('botId', botId);
    router.push(`/bots?${params.toString()}`, { scroll: false });
  };

  const handleAddBot = () => {
    setIsAddBotModalOpen(true);
  };

  const handleConfirmBot = async (token: string, botInfo: { id: number; first_name: string; username?: string }) => {
    try {
      // Call API to save bot
      const response = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_token: token,
          bot_name: botInfo.username || `bot_${botInfo.id}`,
          display_name: botInfo.first_name,
          description: `Bot connected via Telegram API`,
          is_active: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save bot");
      }

      const result = await response.json();
      const savedBot = result.bot;

      // Reload bots list to get the new bot
      const botsResponse = await fetch("/api/bots");
      if (botsResponse.ok) {
        const botsData = await botsResponse.json();
        setBots(botsData.bots || []);
      }

      // Select the newly added bot
      const newBotId = String(savedBot.bot_id);
      setSelectedBotId(newBotId);
      
      // Update URL
      const params = new URLSearchParams();
      params.set('botId', newBotId);
      router.push(`/bots?${params.toString()}`, { scroll: false });

      setIsAddBotModalOpen(false);
    } catch (error) {
      console.error("Error adding bot:", error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleToggleActive = async (active: boolean) => {
    if (!selectedBotId || !botDetails) return;

    // Update local state optimistically
    setBotDetails({
      ...botDetails,
      internal_settings: botDetails.internal_settings
        ? { ...botDetails.internal_settings, active }
        : { token_masked: "", active },
    });

    // TODO: Call API to update bot status
    try {
      const response = await fetch(`/api/bots/${selectedBotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update bot status");
      }
    } catch (error) {
      console.error("Error updating bot status:", error);
      // Revert on error
      setBotDetails({
        ...botDetails,
        internal_settings: botDetails.internal_settings
          ? { ...botDetails.internal_settings, active: !active }
          : { token_masked: "", active: !active },
      });
      toast({
        title: "Error",
        description: "Failed to update bot status",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (): Promise<{
    botApi: "OK" | "ERROR";
    webhook: "OK" | "ERROR";
    errors?: {
      botApi?: string | null;
      webhook?: string | null;
    };
  }> => {
    if (!selectedBotId) {
      throw new Error("No bot selected");
    }

    try {
      const response = await fetch(`/api/bots/${selectedBotId}/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to test connection");
      }

      const data = await response.json();
      return {
        botApi: data.botApi,
        webhook: data.webhook,
        errors: data.errors,
      };
    } catch (error) {
      console.error("Error testing connection:", error);
      throw error;
    }
  };

  const handleAddCourse = () => {
    if (!selectedBotId) {
      toast({
        title: "No bot selected",
        description: "Please select a bot first",
        variant: "destructive",
      });
      return;
    }
    setIsAttachCourseModalOpen(true);
  };

  const handleAttachCourses = async (courseIds: string[]) => {
    if (!selectedBotId) {
      throw new Error("No bot selected");
    }

    try {
      const response = await fetch(`/api/bots/${selectedBotId}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_ids: courseIds,
          environment: "prod", // Можно сделать настраиваемым
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response:", errorData);
        // Если есть детальные ошибки, показываем их
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const errorMessages = errorData.errors.map((e: any) => 
            `Course "${e.course_id}": ${e.error}`
          ).join("; ");
          throw new Error(errorMessages || errorData.message || "Failed to attach courses");
        }
        throw new Error(errorData.message || errorData.error || "Failed to attach courses");
      }

      // Обновляем список подключенных курсов
      await reloadConnectedCourses();
    } catch (error) {
      console.error("Error attaching courses:", error);
      throw error;
    }
  };

  const reloadConnectedCourses = async () => {
    if (!selectedBotId || !botDetails) return;

    try {
      const coursesResponse = await fetch(`/api/bots/${selectedBotId}/courses`);
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        const connectedCourses = coursesData.courses || [];

        // Обновляем botDetails с новым списком курсов
        setBotDetails({
          ...botDetails,
          connected_courses: connectedCourses,
        });
      }
    } catch (error) {
      console.warn("Failed to reload connected courses:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedBotId || !botDetails) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bots/${selectedBotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete bot');
      }

      toast({
        title: 'Bot deleted',
        description: `Bot "${botDetails.display_name || botDetails.bot_name}" has been deleted successfully.`,
      });

      // Remove bot from list
      setBots(bots.filter(b => String(b.bot_id) !== selectedBotId));
      
      // Select another bot or clear selection
      const remainingBots = bots.filter(b => String(b.bot_id) !== selectedBotId);
      if (remainingBots.length > 0) {
        const newSelectedBotId = String(remainingBots[0].bot_id);
        setSelectedBotId(newSelectedBotId);
        const params = new URLSearchParams();
        params.set('botId', newSelectedBotId);
        router.push(`/bots?${params.toString()}`, { scroll: false });
      } else {
        setSelectedBotId(null);
        setBotDetails(null);
        router.push('/bots', { scroll: false });
      }

      setIsDeleteModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete bot',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading bots...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Left Panel - Bots List */}
      <BotsList
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBot={handleSelectBot}
        onAddBot={handleAddBot}
      />

      {/* Center Panel - Bot Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <BotInspector
          key={selectedBotId || 'no-selection'} // Принудительный перерендер при изменении бота
          botDetails={botDetails}
          loading={loadingBotDetails}
          onToggleActive={handleToggleActive}
          onTestConnection={handleTestConnection}
          onAddCourse={handleAddCourse}
          onCourseRemoved={reloadConnectedCourses}
        />

        {/* Delete Button Section */}
        {selectedBotId && botDetails && (
          <div className="border-t border-border bg-card shrink-0">
            <div className="max-w-2xl mx-auto px-6 py-4">
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
        )}
      </div>

      {/* Right Panel - Empty for now */}
      <aside className="w-[320px] border-l border-border bg-card shrink-0" />

      {/* Add Bot Modal */}
      <AddBotModal
        isOpen={isAddBotModalOpen}
        onClose={() => setIsAddBotModalOpen(false)}
        onConfirm={handleConfirmBot}
        existingBots={bots.map((bot) => ({
          bot_id: bot.bot_id,
          bot_name: bot.bot_name,
        }))}
      />

      {/* Attach Course Modal */}
      {selectedBotId && (
        <AttachCourseModal
          isOpen={isAttachCourseModalOpen}
          botId={selectedBotId}
          connectedCourseIds={(botDetails?.connected_courses || []).map((c) => c.id)}
          onClose={() => setIsAttachCourseModalOpen(false)}
          onAttach={handleAttachCourses}
          onCreateCourse={() => {
            setIsAttachCourseModalOpen(false);
            router.push('/course-editor');
            toast({
              title: "Create Course",
              description: "Redirecting to course creation page",
            });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedBotId && botDetails && (
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
