"use client";

/**
 * ImportSessionDialog - Disabled for GitHub Copilot SDK
 * 
 * This feature was specific to Claude Code CLI's session storage.
 * GitHub Copilot SDK manages sessions differently and doesn't 
 * provide a CLI-based session import mechanism.
 */

interface ImportSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportSessionDialog({
  open,
  onOpenChange,
}: ImportSessionDialogProps) {
  // Feature disabled for Copilot SDK
  return null;
}
