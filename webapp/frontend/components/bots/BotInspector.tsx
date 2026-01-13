"use client"

import { TelegramInfoSection } from "./TelegramInfoSection";
import { ApiStatusSection } from "./ApiStatusSection";
import { ConnectedCoursesSection } from "./ConnectedCoursesSection";
import { BotDetails } from "./types";

interface BotInspectorProps {
  botDetails: BotDetails | null;
  loading?: boolean;
  onToggleActive: (active: boolean) => void;
  onTestConnection: () => Promise<{ 
    botApi: "OK" | "ERROR"; 
    webhook: "OK" | "ERROR";
    errors?: {
      botApi?: string | null;
      webhook?: string | null;
    };
  }>;
  onAddCourse: () => void;
  onCourseRemoved?: () => void;
}

export function BotInspector({
  botDetails,
  loading = false,
  onToggleActive,
  onTestConnection,
  onAddCourse,
  onCourseRemoved,
}: BotInspectorProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (!botDetails) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a bot to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-card">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Telegram Info Section */}
        {botDetails.telegram_info && (
          <TelegramInfoSection telegramInfo={botDetails.telegram_info} />
        )}

        {/* API / Status Section */}
        {botDetails.internal_settings && (
          <ApiStatusSection
            internalSettings={botDetails.internal_settings}
            botId={botDetails.id}
            onToggleActive={onToggleActive}
            onTestConnection={onTestConnection}
          />
        )}

        {/* Connected Courses Section */}
        <ConnectedCoursesSection
          courses={botDetails.connected_courses || []}
          botId={botDetails.id}
          onAddCourse={onAddCourse}
          onCourseRemoved={onCourseRemoved}
          onCourseUpdated={onCourseRemoved}
        />
      </div>
    </div>
  );
}
