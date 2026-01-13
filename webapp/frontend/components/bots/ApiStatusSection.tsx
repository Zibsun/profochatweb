"use client"

import { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, CheckCircle2, XCircle } from "lucide-react";
import { BotInternalSettings } from "./types";
import { useToast } from "@/hooks/use-toast";

interface ApiStatusSectionProps {
  internalSettings: BotInternalSettings;
  botId?: string;
  onToggleActive: (active: boolean) => void;
  onTestConnection: () => Promise<{ 
    botApi: "OK" | "ERROR"; 
    webhook: "OK" | "ERROR";
    errors?: {
      botApi?: string | null;
      webhook?: string | null;
    };
  }>;
}

export function ApiStatusSection({
  internalSettings,
  botId,
  onToggleActive,
  onTestConnection,
}: ApiStatusSectionProps) {
  const [showToken, setShowToken] = useState(false);
  const [unmaskedToken, setUnmaskedToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    botApi: "OK" | "ERROR" | null;
    webhook: "OK" | "ERROR" | null;
    errors?: {
      botApi?: string | null;
      webhook?: string | null;
    };
  }>({ botApi: null, webhook: null });
  const { toast } = useToast();

  // Загружаем реальный токен при первом показе
  useEffect(() => {
    if (showToken && !unmaskedToken && botId && !isLoadingToken) {
      setIsLoadingToken(true);
      fetch(`/api/bots/${botId}/token`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to load token");
        })
        .then((data) => {
          setUnmaskedToken(data.token);
        })
        .catch((error) => {
          console.error("Error loading token:", error);
          toast({
            title: "Error",
            description: "Failed to load token",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingToken(false);
        });
    }
  }, [showToken, unmaskedToken, botId, isLoadingToken, toast]);

  const handleCopyToken = async () => {
    // Используем загруженный токен или пытаемся загрузить его
    let tokenToCopy = unmaskedToken || internalSettings.token_unmasked;
    
    // Если токен еще не загружен, загружаем его
    if (!tokenToCopy && botId) {
      try {
        setIsLoadingToken(true);
        const response = await fetch(`/api/bots/${botId}/token`);
        if (response.ok) {
          const data = await response.json();
          tokenToCopy = data.token;
          setUnmaskedToken(data.token);
        } else {
          throw new Error("Failed to load token");
        }
      } catch (error) {
        console.error("Error loading token for copy:", error);
        toast({
          title: "Cannot copy",
          description: "Token is not available",
          variant: "destructive",
        });
        setIsLoadingToken(false);
        return;
      } finally {
        setIsLoadingToken(false);
      }
    }
    
    if (!tokenToCopy || tokenToCopy === "••••••••••••••••••") {
      toast({
        title: "Cannot copy",
        description: "Token is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(tokenToCopy);
      toast({
        title: "Token copied",
        description: "Bot API token has been copied to clipboard",
      });
    } catch (error) {
      console.error("Copy error:", error);
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = tokenToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Token copied",
          description: "Bot API token has been copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy token to clipboard",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults({ botApi: null, webhook: null });
    try {
      const results = await onTestConnection();
      setTestResults(results);
      
      // Показываем предупреждения если есть ошибки
      if (results.errors) {
        if (results.errors.botApi && results.botApi === "ERROR") {
          toast({
            title: "Bot API test failed",
            description: results.errors.botApi || "Bot API connection failed",
            variant: "destructive",
          });
        }
        if (results.errors.webhook && results.webhook === "ERROR") {
          toast({
            title: "Webhook test failed",
            description: results.errors.webhook || "Webhook is not configured",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Test connection error:", error);
      setTestResults({ botApi: "ERROR", webhook: "ERROR" });
      toast({
        title: "Connection test failed",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Определяем, что показывать
  const maskedToken = internalSettings.token_masked || "••••••••••••••••••";
  const actualToken = unmaskedToken || internalSettings.token_unmasked;
  const displayToken = showToken && actualToken ? actualToken : maskedToken;

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          API / Status
        </h3>
      </div>

      <div className="space-y-4">
        {/* Bot API Token */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            Bot API Token
          </div>
          <div className="flex items-center gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={displayToken}
              readOnly
              disabled={isLoadingToken}
              className="flex-1 px-3 py-1.5 text-sm text-foreground bg-background border border-input rounded-md font-mono focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={isLoadingToken ? "Loading..." : undefined}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              disabled={isLoadingToken}
              className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={handleCopyToken}
              disabled={isLoadingToken}
              className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy token"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Bot Status */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            Bot Status
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={internalSettings.active}
              onChange={(e) => onToggleActive(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">
              {internalSettings.active ? "Active" : "Inactive"}
            </span>
          </label>
        </div>

        {/* Test Connection */}
        <div>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </button>
          {(testResults.botApi !== null || testResults.webhook !== null) && (
            <div className="mt-2 space-y-1">
              {testResults.botApi !== null && (
                <div className="flex items-start gap-2 text-xs">
                  {testResults.botApi === "OK" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">
                      Bot API: <span className={testResults.botApi === "OK" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{testResults.botApi}</span>
                    </span>
                    {testResults.errors?.botApi && testResults.botApi === "ERROR" && (
                      <div className="text-red-600 mt-0.5 text-[10px]">
                        {testResults.errors.botApi}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {testResults.webhook !== null && (
                <div className="flex items-start gap-2 text-xs">
                  {testResults.webhook === "OK" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">
                      Webhook: <span className={testResults.webhook === "OK" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{testResults.webhook}</span>
                    </span>
                    {testResults.errors?.webhook && testResults.webhook === "ERROR" && (
                      <div className="text-red-600 mt-0.5 text-[10px]">
                        {testResults.errors.webhook}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
