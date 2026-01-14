"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Group, InviteLink } from "@/lib/types/types";
import { GroupsSidebar } from "./GroupsSidebar";
import { GroupDetailsPanel } from "./GroupDetailsPanel";

type GroupDetailsResponse = {
  group: Group;
  invite_links: InviteLink[];
};

interface GroupsManagementProps {
  initialGroupId?: string;
}

export function GroupsManagement({ initialGroupId }: GroupsManagementProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [groupDetails, setGroupDetails] = useState<GroupDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Sync selection from URL on first load
  useEffect(() => {
    const groupIdFromUrl = searchParams.get("groupId");
    if (groupIdFromUrl && groupIdFromUrl !== selectedGroupId) {
      setSelectedGroupId(groupIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch("/api/groups");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load groups");
      }
      const data = await res.json();
      const list: Group[] = data.groups || [];
      setGroups(list);

      // Auto-select group from URL or first group
      if (list.length > 0) {
        const fromUrl = searchParams.get("groupId");
        if (fromUrl) {
          const exists = list.some((g) => String(g.group_id) === fromUrl);
          if (!selectedGroupId) {
            setSelectedGroupId(exists ? fromUrl : String(list[0].group_id));
          } else if (!exists && selectedGroupId === fromUrl) {
            setSelectedGroupId(String(list[0].group_id));
          }
        } else if (!selectedGroupId) {
          setSelectedGroupId(String(list[0].group_id));
        }
      } else {
        setSelectedGroupId(null);
      }
    } catch (e) {
      console.error("Error loading groups:", e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGroupDetails = async (groupId: string) => {
    setLoadingDetails(true);
    setGroupDetails(null);

    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load group details");
      }
      const data: GroupDetailsResponse = await res.json();
      setGroupDetails({
        group: data.group,
        invite_links: data.invite_links || [],
      });
    } catch (e) {
      console.error("Error loading group details:", e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load group details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Load details when selection changes
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDetails(null);
      setLoadingDetails(false);
      return;
    }
    loadGroupDetails(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => String(g.group_id) === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("groupId", groupId);
    router.push(`/groups?${params.toString()}`, { scroll: false });
  };

  const handleToggleActive = async (active: boolean) => {
    if (!selectedGroupId || !groupDetails) return;

    // optimistic
    setGroupDetails({
      ...groupDetails,
      group: { ...groupDetails.group, is_active: active },
    });

    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      });
      if (!res.ok) throw new Error("Failed to update group");

      const data = await res.json().catch(() => null);
      if (data?.group) {
        setGroupDetails((prev) =>
          prev ? { ...prev, group: { ...prev.group, ...data.group } } : prev
        );
      }
    } catch (e) {
      // revert
      setGroupDetails({
        ...groupDetails,
        group: { ...groupDetails.group, is_active: !active },
      });
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update group",
        variant: "destructive",
      });
    }
  };

  const handleCreateInvite = async (payload: {
    max_uses?: number | null;
    expires_at?: string | null;
    is_active: boolean;
  }) => {
    if (!selectedGroupId) return;
    const res = await fetch(`/api/groups/${selectedGroupId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to create invite");
    }
    await loadGroupDetails(selectedGroupId);
  };

  const handleDeactivateInvite = async (inviteId: number) => {
    const res = await fetch(`/api/invites/${inviteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to deactivate invite");
    }
    if (selectedGroupId) await loadGroupDetails(selectedGroupId);
  };

  const handleSaveDetails = async (payload: {
    bot_id: number;
    course_id: number;
    name?: string;
    description?: string | null;
  }) => {
    if (!selectedGroupId) return;
    console.log("Saving group details:", { selectedGroupId, payload });
    const res = await fetch(`/api/groups/${selectedGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Failed to save group:", errorData);
      throw new Error(errorData.message || "Failed to update group");
    }
    const result = await res.json();
    console.log("Save result:", result);
    await Promise.all([loadGroupDetails(selectedGroupId), loadGroups()]);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      <GroupsSidebar
        groups={groups}
        selectedGroupId={selectedGroupId}
        loading={loadingGroups}
        onSelectGroup={handleSelectGroup}
      />

      <GroupDetailsPanel
        selectedGroup={selectedGroup}
        details={groupDetails}
        loading={loadingDetails}
        onToggleActive={handleToggleActive}
        onSaveDetails={handleSaveDetails}
        onCreateInvite={handleCreateInvite}
        onDeactivateInvite={handleDeactivateInvite}
      />
    </div>
  );
}

