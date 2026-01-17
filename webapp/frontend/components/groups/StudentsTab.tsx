'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParticipantsTable } from './ParticipantsTable';
import { AddParticipantModal } from './AddParticipantModal';
import type { GroupParticipant, InviteLink } from '@/lib/types/types';

interface StudentsTabProps {
  groupId: number;
}

export function StudentsTab({ groupId }: StudentsTabProps) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInviteLink, setSelectedInviteLink] = useState<number | 'manual' | null>(null);

  // Load participants and invite links
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const queryParams = new URLSearchParams();
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      if (selectedInviteLink !== null) {
        if (selectedInviteLink === 'manual') {
          // Filter for participants without invite_link_id
          queryParams.append('invite_link_id', 'null');
        } else {
          queryParams.append('invite_link_id', selectedInviteLink.toString());
        }
      }

      // Load participants and invite links in parallel
      const [participantsRes, inviteLinksRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/participants?${queryParams.toString()}`),
        fetch(`/api/groups/${groupId}/invites`),
      ]);

      if (!participantsRes.ok) {
        throw new Error('Failed to load participants');
      }

      const participantsData = await participantsRes.json();
      setParticipants(participantsData.participants || []);

      if (inviteLinksRes.ok) {
        const inviteLinksData = await inviteLinksRes.json();
        setInviteLinks(inviteLinksData.invite_links || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading participants:', err);
      toast({
        title: 'Error',
        description: 'Failed to load participants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId, searchQuery, selectedInviteLink]);

  const handleAddParticipant = async (data: {
    chat_id?: number;
    username?: string;
    invite_link_id?: number | null;
  }) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add participant');
      }

      toast({
        title: 'Success',
        description: 'Participant added successfully',
      });

      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add participant',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateParticipant = async (
    participantId: number,
    data: {
      chat_id?: number;
      username?: string;
      invite_link_id?: number | null;
    }
  ) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update participant');
      }

      toast({
        title: 'Success',
        description: 'Participant updated successfully',
      });

      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update participant',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteParticipant = async (participantId: number) => {
    if (!confirm('Are you sure you want to remove this participant?')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}/participants/${participantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove participant');
      }

      toast({
        title: 'Success',
        description: 'Participant removed successfully',
      });

      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove participant',
        variant: 'destructive',
      });
    }
  };

  const handleTransferParticipant = async (
    participantId: number,
    targetGroupId: number,
    inviteLinkId?: number | null
  ) => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}/participants/${participantId}/transfer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_group_id: targetGroupId,
            invite_link_id: inviteLinkId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to transfer participant');
      }

      toast({
        title: 'Success',
        description: 'Participant transferred successfully',
      });

      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to transfer participant',
        variant: 'destructive',
      });
    }
  };

  if (loading && participants.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading participants...</span>
      </div>
    );
  }

  if (error && participants.length === 0) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading participants</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by username or chat ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Filter by invite link */}
          <select
            value={selectedInviteLink === null ? '' : selectedInviteLink === 'manual' ? 'manual' : selectedInviteLink}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setSelectedInviteLink(null);
              } else if (value === 'manual') {
                setSelectedInviteLink('manual');
              } else {
                setSelectedInviteLink(parseInt(value));
              }
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All invite links</option>
            <option value="manual">Manual</option>
            {inviteLinks.map((link) => (
              <option key={link.invite_link_id} value={link.invite_link_id}>
                {link.token} ({link.current_uses}/{link.max_uses || '∞'})
              </option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Participants table */}
      {participants.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground mb-4">No participants yet</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Student
          </button>
        </div>
      ) : (
        <ParticipantsTable
          participants={participants}
          inviteLinks={inviteLinks}
          onUpdate={handleUpdateParticipant}
          onDelete={handleDeleteParticipant}
          onTransfer={handleTransferParticipant}
        />
      )}

      {/* Add participant modal */}
      {isAddModalOpen && (
        <AddParticipantModal
          groupId={groupId}
          inviteLinks={inviteLinks}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddParticipant}
        />
      )}
    </div>
  );
}
