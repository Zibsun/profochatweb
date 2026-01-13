"use client"

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Bot } from "@/lib/types/types";

interface BotsListProps {
  bots: Bot[];
  selectedBotId: string | null;
  onSelectBot: (botId: string) => void;
  onAddBot: () => void;
}

export function BotsList({
  bots,
  selectedBotId,
  onSelectBot,
  onAddBot,
}: BotsListProps) {
  return (
    <aside className="bots-list-sidebar border-r border-border bg-card flex flex-col shrink-0 w-[260px]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Bots
        </h2>
      </div>

      {/* Add Bot Button */}
      <div className="p-2 border-b border-border">
        <button
          onClick={onAddBot}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Bot
        </button>
      </div>

      {/* Bots List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
        {bots.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 px-2">
            <p className="text-xs">No bots yet. Add your first bot to get started.</p>
          </div>
        ) : (
          bots.map((bot) => {
            const isSelected = selectedBotId === String(bot.bot_id);
            const displayName = bot.display_name || bot.bot_name;
            const botLabel = displayName.startsWith("@") 
              ? displayName 
              : `@${bot.bot_name}`;

            return (
              <div
                key={bot.bot_id}
                onClick={() => onSelectBot(String(bot.bot_id))}
                className={`w-full text-left px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-xs truncate block">{botLabel}</span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
