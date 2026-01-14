"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Slash, Ban, Edit3 } from "lucide-react";
import { Bot, Group, InviteLink } from "@/lib/types/types";
import { useToast } from "@/hooks/use-toast";
import { AddInviteLinkModal } from "./AddInviteLinkModal";

type CourseOption = {
  course_id: string;
  course_code: string;
  title: string;
};

interface GroupDetailsPanelProps {
  selectedGroup: Group | null;
  details: { group: Group; invite_links: InviteLink[] } | null;
  loading: boolean;
  onToggleActive: (active: boolean) => void;
  onSaveDetails: (payload: {
    bot_id: number;
    course_id: number;
    name?: string;
    description?: string | null;
  }) => Promise<void>;
  onCreateInvite: (payload: {
    max_uses?: number | null;
    expires_at?: string | null;
    is_active: boolean;
  }) => Promise<void>;
  onDeactivateInvite: (inviteId: number) => Promise<void>;
}

export function GroupDetailsPanel({
  selectedGroup,
  details,
  loading,
  onToggleActive,
  onSaveDetails,
  onCreateInvite,
  onDeactivateInvite,
}: GroupDetailsPanelProps) {
  const { toast } = useToast();
  const [isAddInviteOpen, setIsAddInviteOpen] = useState(false);
  const [deactivatingInviteId, setDeactivatingInviteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [bots, setBots] = useState<Bot[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [draftName, setDraftName] = useState<string>("");
  const [draftDescription, setDraftDescription] = useState<string>("");

  const group = details?.group || selectedGroup;
  const invites = details?.invite_links || [];

  useEffect(() => {
    if (group) {
      setSelectedBotId(String(group.bot_id));
      setSelectedCourseId(String(group.course_id));
      setDraftName(group.name || "");
      setDraftDescription(group.description || "");
      setEditingName(false);
      setEditingDescription(false);
    }
  }, [group?.bot_id, group?.course_id, group?.name, group?.description]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [botsRes, coursesRes] = await Promise.all([
          fetch("/api/bots"),
          fetch("/api/courses"),
        ]);
        if (botsRes.ok) {
          const botsData = await botsRes.json();
          setBots(botsData.bots || []);
        }
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
        }
      } catch (e) {
        toast({
          title: "Error",
          description: "Failed to load bots or courses",
          variant: "destructive",
        });
      }
    };
    loadOptions();
  }, [toast]);

  const isDirty =
    group &&
    (String(group.bot_id) !== selectedBotId ||
      String(group.course_id) !== selectedCourseId ||
      (draftName ?? "") !== (group.name ?? "") ||
      (draftDescription ?? "") !== (group.description ?? ""));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground flex items-center gap-2">
          <Slash className="w-4 h-4" />
          <p className="text-sm">Select a group</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-card">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingName(false);
                      }
                      if (e.key === "Escape") {
                        setDraftName(group.name || "");
                        setEditingName(false);
                      }
                    }}
                    autoFocus
                    className="w-full max-w-[420px] px-2 py-1 text-2xl font-semibold text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                  />
                ) : (
                  <>
                    <h1
                      className="text-2xl font-semibold text-foreground truncate cursor-text"
                      onClick={() => setEditingName(true)}
                      title="Click to edit"
                    >
                      {draftName || "Untitled group"}
                    </h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Edit name"
                    >
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
              <div className="mt-2">
                <div className="flex items-start gap-2">
                  {editingDescription ? (
                    <textarea
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      onBlur={() => setEditingDescription(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setDraftDescription(group.description || "");
                          setEditingDescription(false);
                        }
                      }}
                      rows={4}
                      className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                    />
                  ) : (
                    <div
                      className="flex-1 text-sm text-muted-foreground cursor-text"
                      onClick={() => setEditingDescription(true)}
                      title="Click to edit"
                    >
                      {draftDescription || "Add description"}
                    </div>
                  )}
                  {!editingDescription && (
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Edit description"
                    >
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={async () => {
                  if (!group || !isDirty) return;
                  const botIdNum = Number(selectedBotId);
                  const courseIdNum = Number(selectedCourseId);
                  if (!Number.isFinite(botIdNum) || !Number.isFinite(courseIdNum)) {
                    toast({
                      title: "Invalid selection",
                      description: "Bot and course must be valid",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    setSaving(true);
                    await onSaveDetails({
                      bot_id: botIdNum,
                      course_id: courseIdNum,
                      name: draftName.trim(),
                      description: draftDescription.trim() || null,
                    });
                    toast({ title: "Saved", description: "Group updated successfully" });
                  } catch (e) {
                    toast({
                      title: "Error",
                      description: e instanceof Error ? e.message : "Failed to save",
                      variant: "destructive",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(group.is_active)}
                  onChange={(e) => onToggleActive(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {group.is_active ? "Active" : "Inactive"}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Bot</div>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              >
                <option value="">Select bot</option>
                {bots.map((bot) => (
                  <option key={bot.bot_id} value={String(bot.bot_id)}>
                    {bot.display_name || bot.bot_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Course</div>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.title || course.course_code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invite Links */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Invite Links</h2>
            <button
              onClick={() => setIsAddInviteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add invite link
            </button>
          </div>

          {invites.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invites yet</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.invite_link_id} className="border border-border rounded-lg p-4 bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <div className="text-foreground">
                          <span className="text-muted-foreground">token:</span>{" "}
                          <span className="font-mono">{inv.token}</span>
                        </div>
                        <div className="text-foreground">
                          <span className="text-muted-foreground">uses:</span>{" "}
                          {inv.current_uses}/{inv.max_uses ?? "∞"}
                        </div>
                        <div className="text-foreground">
                          <span className="text-muted-foreground">expires:</span>{" "}
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleString("ru-RU") : "—"}
                        </div>
                        <div className="text-foreground">
                          <span className="text-muted-foreground">active:</span>{" "}
                          {inv.is_active ? "true" : "false"}
                        </div>
                      </div>

                      <div className="mt-2">
                        <input
                          readOnly
                          value={inv.invite_url || ""}
                          className="w-full px-3 py-2 text-xs text-foreground bg-background border border-input rounded-md font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inv.invite_url || "");
                            toast({ title: "Copied", description: "Invite link copied to clipboard" });
                          } catch (e) {
                            toast({
                              title: "Error",
                              description: "Failed to copy",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        title="Copy link"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>

                      {inv.is_active && (
                        <button
                          disabled={deactivatingInviteId === inv.invite_link_id}
                          onClick={async () => {
                            try {
                              setDeactivatingInviteId(inv.invite_link_id);
                              await onDeactivateInvite(inv.invite_link_id);
                              toast({ title: "Deactivated", description: "Invite link is now inactive" });
                            } catch (e) {
                              toast({
                                title: "Error",
                                description: e instanceof Error ? e.message : "Failed to deactivate",
                                variant: "destructive",
                              });
                            } finally {
                              setDeactivatingInviteId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deactivate"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddInviteLinkModal
        isOpen={isAddInviteOpen}
        onClose={() => setIsAddInviteOpen(false)}
        onSubmit={onCreateInvite}
      />
    </div>
  );
}

