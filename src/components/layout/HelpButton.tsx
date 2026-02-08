"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-7 w-7"
          >
            <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
            <span className="sr-only">Help</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          How to get GitHub Copilot token
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>GitHub Copilot Token Setup</DialogTitle>
            <DialogDescription>
              Follow this guide to obtain and configure your GitHub Copilot token
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-6 text-sm">
              <section>
                <h2 className="text-xl font-semibold mb-3">Prerequisites</h2>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>A GitHub account</li>
                  <li>An active GitHub Copilot subscription (Individual, Business, or Enterprise)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Step-by-Step Guide</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">1. Sign in to GitHub</h3>
                    <p className="text-muted-foreground">Navigate to <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">github.com</a> and sign in to your account.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">2. Access Personal Access Tokens Settings</h3>
                    <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                      <li>Click on your profile picture in the top-right corner</li>
                      <li>Select <strong>Settings</strong> from the dropdown menu</li>
                      <li>In the left sidebar, scroll down and click on <strong>Developer settings</strong></li>
                      <li>Click on <strong>Personal access tokens</strong></li>
                      <li>Select <strong>Tokens (classic)</strong> or <strong>Fine-grained tokens</strong> (recommended)</li>
                    </ol>
                    <p className="mt-2">
                      <strong>Direct link:</strong>{" "}
                      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        github.com/settings/tokens
                      </a>
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">3. Generate a New Token</h3>
                    
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium mb-2">For Fine-Grained Tokens (Recommended):</h4>
                        <ol className="list-decimal list-inside space-y-1 ml-2 text-sm text-muted-foreground">
                          <li>Click <strong>Generate new token</strong> → <strong>Fine-grained token</strong></li>
                          <li>Fill in: <strong>Token name</strong> (e.g., "CodePilot Desktop App")</li>
                          <li><strong>Expiration</strong>: Choose an expiration period (90 days recommended)</li>
                          <li>Under <strong>Permissions</strong>, expand <strong>Account permissions</strong></li>
                          <li>Enable <strong>Copilot: Read access</strong> (required)</li>
                          <li>Click <strong>Generate token</strong> at the bottom</li>
                        </ol>
                      </div>

                      <div className="border-l-4 border-gray-400 pl-4">
                        <h4 className="font-medium mb-2">For Classic Tokens:</h4>
                        <ol className="list-decimal list-inside space-y-1 ml-2 text-sm text-muted-foreground">
                          <li>Click <strong>Generate new token</strong> → <strong>Generate new token (classic)</strong></li>
                          <li><strong>Note</strong>: Enter a descriptive name (e.g., "CodePilot Desktop App")</li>
                          <li><strong>Expiration</strong>: Choose an expiration period (90 days recommended)</li>
                          <li>Select scopes: <code className="bg-muted px-1 py-0.5 rounded">user:email</code>, <code className="bg-muted px-1 py-0.5 rounded">read:org</code> (if using org Copilot)</li>
                          <li>Click <strong>Generate token</strong></li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">4. Copy Your Token</h3>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-3 rounded-r">
                      <p className="font-medium">⚠️ Important</p>
                      <p className="text-sm mt-1">Copy your token immediately! You won't be able to see it again.</p>
                    </div>
                    <p className="mt-2 text-muted-foreground">The token will look like:</p>
                    <ul className="list-disc list-inside ml-2 text-sm text-muted-foreground">
                      <li>Fine-grained: <code className="bg-muted px-1 py-0.5 rounded">github_pat_...</code></li>
                      <li>Classic: <code className="bg-muted px-1 py-0.5 rounded">ghp_...</code></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">5. Configure CodePilot</h3>
                    <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                      <li>Open CodePilot application</li>
                      <li>Navigate to <strong>Settings</strong></li>
                      <li>Find the <strong>GitHub Copilot Authentication</strong> section</li>
                      <li>Paste your token into the <strong>GitHub Token</strong> field</li>
                      <li>Click <strong>Save GitHub Token</strong></li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">6. Verify Connection</h3>
                    <p className="text-muted-foreground">After saving the token:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                      <li>Check the connection status indicator in the top bar</li>
                      <li>It should show as "Connected"</li>
                      <li>Try starting a new chat to verify the integration works</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Alternative: Using GitHub Copilot CLI</h2>
                <p className="text-muted-foreground mb-2">If you prefer not to use a token, authenticate using the GitHub Copilot CLI:</p>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                  <code>{`# Install GitHub Copilot CLI\nnpm install -g @github/copilot\n\n# Authenticate\ncopilot\n# Then run /login command in the CLI`}</code>
                </pre>
                <p className="text-muted-foreground mt-2">CodePilot will automatically use your authenticated session from the CLI.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Troubleshooting</h2>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium">"Invalid token" error</h4>
                    <ul className="list-disc list-inside ml-2 text-sm text-muted-foreground">
                      <li>Verify the token was copied correctly (no extra spaces)</li>
                      <li>Ensure the token hasn't expired</li>
                      <li>Check that you selected the correct permissions/scopes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">"No Copilot subscription" error</h4>
                    <ul className="list-disc list-inside ml-2 text-sm text-muted-foreground">
                      <li>Verify you have an active GitHub Copilot subscription</li>
                      <li>Check your subscription at <a href="https://github.com/settings/copilot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">github.com/settings/copilot</a></li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Security Best Practices</h2>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-muted-foreground">
                  <li><strong>Never share your token</strong> with anyone or commit it to version control</li>
                  <li><strong>Use fine-grained tokens</strong> with minimal required permissions</li>
                  <li><strong>Set reasonable expiration dates</strong> (30-90 days recommended)</li>
                  <li><strong>Revoke unused tokens</strong> from your GitHub tokens page</li>
                  <li><strong>Rotate tokens regularly</strong> for enhanced security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Need Help?</h2>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a href="https://docs.github.com/en/copilot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      GitHub Copilot Documentation
                    </a>
                  </li>
                  <li>
                    <a href="https://support.github.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      GitHub Support
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/BenHao-WTG/CodePilot/issues" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      CodePilot Issues
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
