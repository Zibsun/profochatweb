'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { GroupParticipant, Group } from '@/lib/types/types';

interface TransferParticipantModalProps {
  participant: GroupParticipant;
  currentGroupId: number;
  onClose: () => void;
  onTransfer: (targetGroupId: number, inviteLinkId?: number | null) => Promise<void>;
}

export function TransferParticipantModal({
  participant,
  currentGroupId,
  onClose,
  onTransfer,
}: TransferParticipantModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [inviteLinkId, setInviteLinkId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (targetGroupId) {
      loadInviteLinks(targetGroupId);
    } else {
      setInviteLinks([]);
      setInviteLinkId(null);
    }
  }, [targetGroupId]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to load groups');
      const data = await response.json();
      // Filter out current group
      const filteredGroups = data.groups.filter(
        (g: Group) => g.group_id !== currentGroupId
      );
      setGroups(filteredGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadInviteLinks = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/invites`);
      if (!response.ok) throw new Error('Failed to load invite links');
      const data = await response.json();
      setInviteLinks(data.invite_links || []);
    } catch (err) {
      console.error('Error loading invite links:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetGroupId) {
      setError('Please select a target group');
      return;
    }

    try {
      setTransferring(true);
      await onTransfer(targetGroupId, inviteLinkId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer participant');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Transfer Student</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Group *
            </label>
            {loading ? (
              <div className="px-4 py-2 bg-muted rounded-lg text-muted-foreground">
                Loading groups...
              </div>
            ) : (
              <select
                value={targetGroupId || ''}
                onChange={(e) =>
                  setTargetGroupId(e.target.value ? parseInt(e.target.value) : null)
                }
                required
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.name} ({group.course?.title || group.course?.course_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {targetGroupId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Invite Link (optional)
              </label>
              <select
                value={inviteLinkId || ''}
                onChange={(e) =>
                  setInviteLinkId(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {inviteLinks.map((link) => (
                  <option key={link.invite_link_id} value={link.invite_link_id}>
                    {link.token} ({link.current_uses}/{link.max_uses || '∞'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferring || !targetGroupId}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {transferring ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
