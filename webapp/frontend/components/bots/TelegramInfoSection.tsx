"use client"

import { TelegramInfo } from "./types";

interface TelegramInfoSectionProps {
  telegramInfo: TelegramInfo;
}

export function TelegramInfoSection({ telegramInfo }: TelegramInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Telegram Info
        </h3>
      </div>

      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {telegramInfo.avatar ? (
              <img
                src={telegramInfo.avatar}
                alt={telegramInfo.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Bot
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {telegramInfo.display_name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {telegramInfo.bot_username}
            </div>
          </div>
        </div>

        {/* About */}
        {telegramInfo.about && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              About
            </div>
            <div className="text-sm text-foreground">
              {telegramInfo.about}
            </div>
          </div>
        )}

        {/* Short About */}
        {telegramInfo.short_about && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Short About
            </div>
            <div className="text-sm text-foreground">
              {telegramInfo.short_about}
            </div>
          </div>
        )}

        {/* Commands */}
        {telegramInfo.commands && telegramInfo.commands.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Commands
            </div>
            <div className="space-y-1.5">
              {telegramInfo.commands.map((cmd, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="font-mono text-primary font-medium">
                    {cmd.command}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-foreground">{cmd.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
