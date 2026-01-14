"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Group } from "@/lib/types/types";

interface GroupsSidebarProps {
  groups: Group[];
  selectedGroupId: string | null;
  loading: boolean;
  onSelectGroup: (groupId: string) => void;
}

export function GroupsSidebar({
  groups,
  selectedGroupId,
  loading,
  onSelectGroup,
}: GroupsSidebarProps) {
  return (
    <aside className="border-r border-border bg-card flex flex-col shrink-0 w-[260px]">
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Groups
        </h2>
      </div>

      <div className="p-2 border-b border-border">
        <Link
          href="/groups/new"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create group
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
        {loading ? (
          <div className="text-center text-muted-foreground py-8 px-2">
            <p className="text-xs">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 px-2">
            <div className="text-sm font-medium text-foreground mb-1">No groups yet</div>
            <Link
              href="/groups/new"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors mt-3"
            >
              Create group
            </Link>
          </div>
        ) : (
          groups.map((g) => {
            const isSelected = selectedGroupId === String(g.group_id);
            return (
              <div
                key={g.group_id}
                onClick={() => onSelectGroup(String(g.group_id))}
                className={`w-full text-left px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-xs truncate block">{g.name}</span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

