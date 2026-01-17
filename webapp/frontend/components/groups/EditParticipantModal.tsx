'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { GroupParticipant, InviteLink } from '@/lib/types/types';

interface EditParticipantModalProps {
  participant: GroupParticipant;
  inviteLinks: InviteLink[];
  onClose: () => void;
  onSave: (data: {
    chat_id?: number;
    username?: string;
    invite_link_id?: number | null;
  }) => Promise<void>;
}

export function EditParticipantModal({
  participant,
  inviteLinks,
  onClose,
  onSave,
}: EditParticipantModalProps) {
  const [chatId, setChatId] = useState('');
  const [username, setUsername] = useState('');
  const [inviteLinkId, setInviteLinkId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChatId(participant.chat_id?.toString() || '');
    setUsername(participant.username || '');
    setInviteLinkId(participant.invite_link_id);
  }, [participant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!chatId && !username) {
      setError('Either Chat ID or Username must be provided');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        chat_id: chatId ? parseInt(chatId) : undefined,
        username: username || undefined,
        invite_link_id: inviteLinkId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update participant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Student</h2>
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
              Chat ID
            </label>
            <input
              type="number"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="john_doe"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

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
              <option value="">None (Manual)</option>
              {inviteLinks.map((link) => (
                <option key={link.invite_link_id} value={link.invite_link_id}>
                  {link.token} ({link.current_uses}/{link.max_uses || '∞'})
                </option>
              ))}
            </select>
          </div>

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
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
