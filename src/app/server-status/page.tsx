'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export default function ServerStatus() {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check if running in Tauri environment
    const checkTauri = async () => {
      try {
        // Dynamically import Tauri API only in browser
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { invoke } = await import('@tauri-apps/api/core')
          
          const fetchLogs = async () => {
            try {
              const serverLogs = await invoke<string[]>('get_server_logs')
              const serverStatus = await invoke<boolean>('get_server_status')
              setLogs(serverLogs)
              setStatus(serverStatus)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to fetch server logs')
            }
          }

          fetchLogs()
          const interval = setInterval(fetchLogs, 2000)
          return () => clearInterval(interval)
        } else {
          setError('Not running in Tauri environment')
        }
      } catch (err) {
        setError('Failed to load Tauri API')
      }
    }

    checkTauri()
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-4 pb-4">
        <h1 className="text-xl font-semibold mb-3">Server Status</h1>
      </div>
      
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="space-y-4 max-w-4xl">
          {/* Status Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Next.js Server:
              </span>
              <Badge variant={status ? "default" : "secondary"} className="gap-1.5">
                <span className={`h-2 w-2 rounded-full ${status ? 'bg-green-500' : 'bg-gray-400'}`} />
                {status ? 'Running' : 'Not Running (Dev Mode)'}
              </Badge>
            </div>
          </Card>

          {/* Logs Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">
              Server Logs
            </h2>
            
            {error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs max-h-[500px] overflow-auto">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`py-0.5 ${
                      log.includes('ERROR')
                        ? 'text-red-600 dark:text-red-400'
                        : log.includes('SUCCESS') || log.includes('ready')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-foreground/80'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No logs available</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
