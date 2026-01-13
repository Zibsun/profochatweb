"use client"

import { useState, useEffect, useRef } from "react";
import { X, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  photo_url?: string;
}

interface AddBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (token: string, botInfo: TelegramBotInfo) => Promise<void>;
  existingBots?: Array<{ bot_id: number; bot_name: string }>;
}

type ModalStep = "input" | "validating" | "confirmed" | "error";

export function AddBotModal({
  isOpen,
  onClose,
  onConfirm,
  existingBots = [],
}: AddBotModalProps) {
  const [token, setToken] = useState("");
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setToken("");
      setStep("input");
      setError(null);
      setBotInfo(null);
      setIsSubmitting(false);
      // Focus input after a short delay
      setTimeout(() => {
        tokenInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "validating") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, step, onClose]);

  const validateToken = async (tokenValue: string): Promise<TelegramBotInfo> => {
    // Mock API call - replace with actual Telegram API call
    // In production, this should call your backend which calls Telegram API
    const response = await fetch("/api/telegram/getMe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Invalid token. Make sure you copied it entirely from BotFather.");
    }

    const data = await response.json();
    return data.bot;
  };

  const handleConnect = async () => {
    const trimmedToken = token.trim();
    
    if (!trimmedToken) {
      setError("Please enter a bot token");
      return;
    }

    // Basic token format validation (Telegram tokens are typically "number:alphanumeric")
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(trimmedToken)) {
      setError("Invalid token format. Token should be in format: 123456789:ABCdef...");
      return;
    }

    setStep("validating");
    setError(null);

    try {
      const info = await validateToken(trimmedToken);
      
      // Check if bot already exists
      if (existingBots.some((bot) => bot.bot_name === info.username)) {
        setError(`Bot @${info.username} is already connected.`);
        setStep("error");
        return;
      }

      setBotInfo(info);
      setStep("confirmed");
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Invalid token. Make sure you copied it entirely from BotFather.";
      setError(errorMessage);
      setStep("error");
    }
  };

  const handleConfirm = async () => {
    if (!botInfo || !token.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(token.trim(), botInfo);
      toast({
        title: "Bot connected",
        description: `Successfully connected @${botInfo.username || botInfo.first_name}`,
      });
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to connect bot. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (step === "validating") return; // Prevent closing during validation
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden border border-border"
        style={{ minWidth: "min(600px, calc(100vw - 2rem))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-start justify-between shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">Add Telegram Bot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your bot using the Telegram Bot API Token.
            </p>
          </div>
          {step !== "validating" && (
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-muted transition-colors ml-4"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
          {/* Mini Guide */}
          {step === "input" && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                How to get a token
              </h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">1.</span>
                  <span>Open Telegram → <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">2.</span>
                  <span>Select an existing bot or create a new one (<code className="bg-muted px-1 py-0.5 rounded text-xs">/newbot</code>)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">3.</span>
                  <span>Press "API Token"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">4.</span>
                  <span>Copy the token and paste it below</span>
                </li>
              </ol>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open BotFather
              </a>
            </div>
          )}

          {/* Token Input */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="bot-token" className="block text-sm font-medium text-foreground mb-1.5">
                  Bot API Token
                </label>
                <input
                  ref={tokenInputRef}
                  id="bot-token"
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && token.trim()) {
                      handleConnect();
                    }
                  }}
                  placeholder="123456789:ABCDEF..."
                  className="w-full px-4 py-2.5 text-sm text-foreground bg-background border border-input rounded-lg focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                  disabled={step === "validating"}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  We use the token only to manage your bot. You can revoke it at any time via BotFather.
                </p>
                {error && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validating State */}
          {step === "validating" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-foreground">Validating token...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please wait while we verify your bot token.
              </p>
            </div>
          )}

          {/* Error State */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">Validation Failed</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
              <div>
                <label htmlFor="bot-token-retry" className="block text-sm font-medium text-foreground mb-1.5">
                  Bot API Token
                </label>
                <input
                  id="bot-token-retry"
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError(null);
                    setStep("input");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && token.trim()) {
                      handleConnect();
                    }
                  }}
                  placeholder="123456789:ABCDEF..."
                  className="w-full px-4 py-2.5 text-sm text-foreground bg-background border border-input rounded-lg focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {/* Confirmation State */}
          {step === "confirmed" && botInfo && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">Token validated successfully!</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border">
                    {botInfo.photo_url ? (
                      <img
                        src={botInfo.photo_url}
                        alt={botInfo.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-semibold">
                        {botInfo.first_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Bot Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-foreground truncate">
                      {botInfo.first_name}
                    </div>
                    {botInfo.username && (
                      <div className="text-sm text-muted-foreground truncate">
                        @{botInfo.username}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Bot ID: {botInfo.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-foreground">
                  Do you want to connect this bot?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="p-4 sm:p-6 border-t border-border flex items-center justify-end gap-3 shrink-0">
          {step === "input" && (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!token.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect Bot
              </button>
            </>
          )}

          {step === "error" && (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!token.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try Again
              </button>
            </>
          )}

          {step === "confirmed" && (
            <>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </>
          )}

          {step === "validating" && (
            <div className="w-full text-center">
              <p className="text-xs text-muted-foreground">
                Please wait...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
