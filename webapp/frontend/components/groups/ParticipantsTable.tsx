'use client';

import { useState } from 'react';
import { Edit, Trash2, ArrowRight } from 'lucide-react';
import { ParticipantRow } from './ParticipantRow';
import { EditParticipantModal } from './EditParticipantModal';
import { TransferParticipantModal } from './TransferParticipantModal';
import type { GroupParticipant, InviteLink } from '@/lib/types/types';

interface ParticipantsTableProps {
  participants: GroupParticipant[];
  inviteLinks: InviteLink[];
  onUpdate: (
    participantId: number,
    data: { chat_id?: number; username?: string; invite_link_id?: number | null }
  ) => Promise<void>;
  onDelete: (participantId: number) => Promise<void>;
  onTransfer: (
    participantId: number,
    targetGroupId: number,
    inviteLinkId?: number | null
  ) => Promise<void>;
}

export function ParticipantsTable({
  participants,
  inviteLinks,
  onUpdate,
  onDelete,
  onTransfer,
}: ParticipantsTableProps) {
  const [editingParticipant, setEditingParticipant] = useState<GroupParticipant | null>(null);
  const [transferringParticipant, setTransferringParticipant] = useState<GroupParticipant | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Chat ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Invite Link
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Added At
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Added By
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <ParticipantRow
                  key={participant.courseparticipant_id}
                  participant={participant}
                  onEdit={() => setEditingParticipant(participant)}
                  onDelete={() => onDelete(participant.courseparticipant_id)}
                  onTransfer={() => setTransferringParticipant(participant)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingParticipant && (
        <EditParticipantModal
          participant={editingParticipant}
          inviteLinks={inviteLinks}
          onClose={() => setEditingParticipant(null)}
          onSave={async (data) => {
            await onUpdate(editingParticipant.courseparticipant_id, data);
            setEditingParticipant(null);
          }}
        />
      )}

      {/* Transfer modal */}
      {transferringParticipant && (
        <TransferParticipantModal
          participant={transferringParticipant}
          currentGroupId={transferringParticipant.course_group_id}
          onClose={() => setTransferringParticipant(null)}
          onTransfer={async (targetGroupId, inviteLinkId) => {
            await onTransfer(transferringParticipant.courseparticipant_id, targetGroupId, inviteLinkId);
            setTransferringParticipant(null);
          }}
        />
      )}
    </>
  );
}
