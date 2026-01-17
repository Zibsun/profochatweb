"use client";

import { useEffect, useState, useRef } from "react";
import { Copy, Plus, Slash, Edit3, Trash2 } from "lucide-react";
import { Bot, Group, InviteLink } from "@/lib/types/types";
import { useToast } from "@/hooks/use-toast";
import { AddInviteLinkModal } from "./AddInviteLinkModal";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { ScheduleTab } from "./ScheduleTab";
import { StudentsTab } from "./StudentsTab";

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
  onToggleInviteStatus: (inviteId: number, isActive: boolean) => Promise<void>;
  onDeleteInvite: (inviteId: number) => Promise<void>;
}

export function GroupDetailsPanel({
  selectedGroup,
  details,
  loading,
  onToggleActive,
  onSaveDetails,
  onCreateInvite,
  onToggleInviteStatus,
  onDeleteInvite,
}: GroupDetailsPanelProps) {
  const { toast } = useToast();
  const [isAddInviteOpen, setIsAddInviteOpen] = useState(false);
  const [togglingInviteId, setTogglingInviteId] = useState<number | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [bots, setBots] = useState<Bot[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [draftName, setDraftName] = useState<string>("");
  const [draftDescription, setDraftDescription] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const botSelectRef = useRef<HTMLSelectElement>(null);
  const courseSelectRef = useRef<HTMLSelectElement>(null);

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

  const saveGroupDetails = async (updates?: {
    botId?: string;
    courseId?: string;
    name?: string;
    description?: string;
  }) => {
    if (!group) return;
    const botIdToSave = updates?.botId ?? selectedBotId;
    const courseIdToSave = updates?.courseId ?? selectedCourseId;
    const nameToSave = updates?.name ?? draftName;
    const descriptionToSave = updates?.description ?? draftDescription;

    const botIdNum = Number(botIdToSave);
    const courseIdNum = Number(courseIdToSave);
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
        name: nameToSave.trim(),
        description: descriptionToSave.trim() || null,
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
  };

  const handleNameBlur = async () => {
    setEditingName(false);
    if (group && draftName.trim() !== (group.name || "")) {
      await saveGroupDetails();
    }
  };

  const handleDescriptionBlur = async () => {
    setEditingDescription(false);
    if (group && draftDescription.trim() !== (group.description || "")) {
      await saveGroupDetails();
    }
  };

  const handleBotChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBotId = e.target.value;
    setSelectedBotId(newBotId);
    if (group && newBotId !== String(group.bot_id)) {
      await saveGroupDetails({ botId: newBotId });
    }
  };

  const handleCourseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourseId = e.target.value;
    setSelectedCourseId(newCourseId);
    if (group && newCourseId !== String(group.course_id)) {
      await saveGroupDetails({ courseId: newCourseId });
    }
  };

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
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      nameInputRef.current?.blur();
                    }
                    if (e.key === "Escape") {
                      setDraftName(group.name || "");
                      setEditingName(false);
                    }
                  }}
                  autoFocus
                  className="w-full px-2 py-1 text-3xl font-bold text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                />
              ) : (
                <div className="group flex items-center gap-3">
                  <h1
                    className="text-3xl font-bold text-foreground truncate cursor-text"
                    onClick={() => setEditingName(true)}
                    title="Click to edit"
                  >
                    {draftName || "Untitled group"}
                  </h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit name"
                  >
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            <Badge variant={group.is_active ? "success" : "secondary"}>
              {group.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        {group && (
          <div className="border-b border-border">
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
          <ScheduleTab groupId={group.group_id} courseCode={group.course?.course_code || String(group.course_id)} />
        ) : group && activeTab === 'students' ? (
          <StudentsTab groupId={group.group_id} />
        ) : (
          <>
            {/* Info Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Group info</h2>
          
          <div className="space-y-4">
            {/* Description */}
            <div>
              {editingDescription ? (
                <textarea
                  ref={descriptionTextareaRef}
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDraftDescription(group.description || "");
                      setEditingDescription(false);
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                  placeholder="Add description"
                />
              ) : (
                <div className="flex items-start gap-2">
                  <p
                    className="flex-1 text-sm text-muted-foreground cursor-text min-h-[1.5rem]"
                    onClick={() => setEditingDescription(true)}
                    title="Click to edit"
                  >
                    {draftDescription || "Add description"}
                  </p>
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                    title="Edit description"
                  >
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            {/* Bot and Course */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Bot</label>
                <select
                  ref={botSelectRef}
                  value={selectedBotId}
                  onChange={handleBotChange}
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Course</label>
                <select
                  ref={courseSelectRef}
                  value={selectedCourseId}
                  onChange={handleCourseChange}
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
        </div>

        {/* Invite Links Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Invite links</h2>
            <button
              onClick={() => setIsAddInviteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add invite link
            </button>
          </div>

          {invites.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">No invite links yet</p>
              <button
                onClick={() => setIsAddInviteOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add invite link
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div
                  key={inv.invite_link_id}
                  className="border border-border rounded-lg p-4 bg-background"
                >
                  <div className="space-y-3">
                    {/* Fields in rows */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-20">Token:</span>
                        <span className="text-sm font-mono text-foreground">{inv.token}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-20">Uses:</span>
                        <span className="text-sm text-foreground">
                          {inv.current_uses}/{inv.max_uses ?? "∞"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-20">Expires:</span>
                        <span className="text-sm text-foreground">
                          {inv.expires_at
                            ? new Date(inv.expires_at).toLocaleString("ru-RU")
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-20">Status:</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={inv.is_active}
                            onCheckedChange={async (checked) => {
                              try {
                                setTogglingInviteId(inv.invite_link_id);
                                await onToggleInviteStatus(inv.invite_link_id, checked);
                                toast({
                                  title: checked ? "Activated" : "Deactivated",
                                  description: `Invite link is now ${checked ? "active" : "inactive"}`,
                                });
                              } catch (e) {
                                toast({
                                  title: "Error",
                                  description:
                                    e instanceof Error ? e.message : "Failed to update status",
                                  variant: "destructive",
                                });
                              } finally {
                                setTogglingInviteId(null);
                              }
                            }}
                            disabled={togglingInviteId === inv.invite_link_id}
                          />
                          <Badge variant={inv.is_active ? "success" : "secondary"}>
                            {inv.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Telegram link */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">Telegram link:</span>
                        <input
                          readOnly
                          value={inv.invite_url || ""}
                          className="flex-1 px-3 py-2 text-xs text-foreground bg-muted border border-input rounded-md font-mono"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inv.invite_url || "");
                            toast({
                              title: "Copied",
                              description: "Invite link copied to clipboard",
                            });
                          } catch (e) {
                            toast({
                              title: "Error",
                              description: "Failed to copy",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                        title="Copy link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy link
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={deletingInviteId === inv.invite_link_id}
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this invite link? This action cannot be undone.")) {
                              return;
                            }
                            try {
                              setDeletingInviteId(inv.invite_link_id);
                              await onDeleteInvite(inv.invite_link_id);
                              toast({
                                title: "Deleted",
                                description: "Invite link deleted successfully",
                              });
                            } catch (e) {
                              toast({
                                title: "Error",
                                description:
                                  e instanceof Error ? e.message : "Failed to delete",
                                variant: "destructive",
                              });
                            } finally {
                              setDeletingInviteId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <AddInviteLinkModal
        isOpen={isAddInviteOpen}
        onClose={() => setIsAddInviteOpen(false)}
        onSubmit={onCreateInvite}
      />
    </div>
  );
}
