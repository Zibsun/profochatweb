"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddInviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    max_uses?: number | null;
    expires_at?: string | null;
    is_active: boolean;
  }) => Promise<void>;
}

export function AddInviteLinkModal({ isOpen, onClose, onSubmit }: AddInviteLinkModalProps) {
  const { toast } = useToast();

  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const payload = useMemo(() => {
    const max = maxUses.trim() === "" ? null : Number(maxUses);
    const max_uses = Number.isFinite(max) ? max : null;

    const expires_at =
      expiresAt.trim() === ""
        ? null
        : new Date(expiresAt).toISOString(); // backend passes through to pg

    return {
      max_uses,
      expires_at,
      is_active: isActive,
    };
  }, [expiresAt, isActive, maxUses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !saving && onClose()}>
      <div
        className="bg-card rounded-xl shadow-2xl w-[90%] max-w-md p-6 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add invite link</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure max uses, optional expiration, and active status.
            </p>
          </div>
          {!saving && (
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Close">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">max_uses</label>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              placeholder="e.g. 100"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">expires_at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
              disabled={saving}
            />
            <div className="mt-1 text-[11px] text-muted-foreground">Leave empty for no expiration.</div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                disabled={saving}
              />
              <span className="text-sm text-foreground">{isActive ? "Active" : "Inactive"}</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await onSubmit(payload);
                toast({ title: "Invite created", description: "New invite link has been added." });
                onClose();
              } catch (e) {
                toast({
                  title: "Error",
                  description: e instanceof Error ? e.message : "Failed to create invite",
                  variant: "destructive",
                });
              } finally {
                setSaving(false);
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

