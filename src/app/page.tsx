'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  MessageAdd01Icon, 
  GitPullRequestIcon, 
  Settings01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon
} from '@hugeicons/core-free-icons';

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface CopilotStatus {
  available: boolean;
  model?: string;
  error?: string;
}

export default function Home() {
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent sessions
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setRecentSessions(data.sessions.slice(0, 5));
        }
      })
      .catch(console.error);

    // Check Copilot status
    fetch('/api/copilot-status')
      .then(res => res.json())
      .then(data => {
        setCopilotStatus(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to CodePilot</h1>
          <p className="text-lg text-muted-foreground">
            Your desktop GUI for GitHub Copilot
          </p>
        </div>

        {/* Connection Status */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon 
                  icon={copilotStatus?.available ? CheckmarkCircle02Icon : AlertCircleIcon} 
                  className={`h-5 w-5 ${copilotStatus?.available ? 'text-green-500' : 'text-yellow-500'}`}
                />
                GitHub Copilot Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {copilotStatus?.available ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ✅ Connected and ready to use
                  </p>
                  {copilotStatus.model && (
                    <p className="text-sm text-muted-foreground">
                      Model: {copilotStatus.model}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    ⚠️ GitHub Copilot is not connected
                  </p>
                  {copilotStatus?.error && (
                    <p className="text-sm text-muted-foreground">
                      {copilotStatus.error}
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSettings}
                    className="mt-2"
                  >
                    <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4 mr-2" />
                    Configure Settings
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer transition-colors hover:bg-accent" onClick={handleNewChat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={MessageAdd01Icon} className="h-5 w-5" />
                New Chat
              </CardTitle>
              <CardDescription>
                Start a new conversation with GitHub Copilot
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-accent" onClick={handleSettings}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={Settings01Icon} className="h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure your GitHub token and preferences
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={GitPullRequestIcon} className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
              <CardDescription>
                Continue where you left off
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => handleOpenSession(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title || 'Untitled Session'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>📝 Click "New Chat" to start a conversation</p>
            <p>⚙️ Configure your GitHub token in Settings</p>
            <p>💡 Use the help button (top right) for documentation</p>
            <p>🎨 Toggle between light and dark mode as you prefer</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
