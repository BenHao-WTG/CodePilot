"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopilotStatus {
  connected: boolean;
  hasToken: boolean;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<CopilotStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      // Check if we have a GitHub token configured
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        const activeProvider = data.providers?.find((p: { is_active: boolean }) => p.is_active);
        const hasToken = !!activeProvider?.api_key || !!process.env.GITHUB_TOKEN;
        setStatus({ connected: hasToken, hasToken });
      } else {
        setStatus({ connected: false, hasToken: false });
      }
    } catch {
      setStatus({ connected: false, hasToken: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const connected = status?.connected ?? false;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={cn(
          "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors",
          status === null
            ? "bg-muted text-muted-foreground"
            : connected
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/15 text-red-700 dark:text-red-400"
        )}
      >
        <span
          className={cn(
            "block h-1.5 w-1.5 shrink-0 rounded-full",
            status === null
              ? "bg-muted-foreground/40"
              : connected
                ? "bg-emerald-500"
                : "bg-red-500"
          )}
        />
        {status === null
          ? "Checking"
          : connected
            ? "Connected"
            : "Disconnected"}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {connected ? "GitHub Copilot Connected" : "GitHub Copilot Not Configured"}
            </DialogTitle>
            <DialogDescription>
              {connected
                ? "GitHub Copilot SDK is configured and ready."
                : "A GitHub token is required to use this application."}
            </DialogDescription>
          </DialogHeader>

          {connected ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 px-4 py-3">
                <span className="block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Active</p>
                  <p className="text-xs text-muted-foreground">GitHub token configured</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                <span className="block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <p className="font-medium text-red-700 dark:text-red-400">Token not configured</p>
              </div>

              <div>
                <h4 className="font-medium mb-1.5">1. Get a GitHub Token</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Visit{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GitHub Settings
                  </a>{" "}
                  to create a personal access token
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1.5">2. Configure in Settings</h4>
                <p className="text-xs text-muted-foreground">
                  Go to Settings and add your GitHub token in the Provider section
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                checkStatus();
              }}
            >
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
