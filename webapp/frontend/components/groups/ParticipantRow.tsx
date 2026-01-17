'use client';

import { Edit, Trash2, ArrowRight } from 'lucide-react';
import type { GroupParticipant } from '@/lib/types/types';

interface ParticipantRowProps {
  participant: GroupParticipant;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
}

export function ParticipantRow({
  participant,
  onEdit,
  onDelete,
  onTransfer,
}: ParticipantRowProps) {
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
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm text-foreground">
        {participant.username ? (
          <span>@{participant.username}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {participant.chat_id ? (
          <span className="font-mono">{participant.chat_id}</span>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {participant.invite_link ? (
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
            {participant.invite_link.token}
          </span>
        ) : (
          <span className="text-muted-foreground italic">Manual</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatDate(participant.added_at)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {participant.added_by ? (
          <span className="font-mono">{participant.added_by}</span>
        ) : (
          <span>System</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={onTransfer}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Transfer"
          >
            <ArrowRight className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
