'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

interface TauriEvent {
  payload: string
}

export default function SplashPage() {
  const [status, setStatus] = useState<string>('Initializing...')
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const setupListener = async () => {
      try {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { listen } = await import('@tauri-apps/api/event')
          
          const unlisten = await listen<string>('startup-status', (event: TauriEvent) => {
            const message = event.payload
            setStatus(message)
            
            // Update progress based on status
            if (message.includes('Locating Node.js')) {
              setProgress(10)
            } else if (message.includes('Searching for Node.js')) {
              setProgress(20)
            } else if (message.includes('Found Node.js')) {
              setProgress(40)
            } else if (message.includes('Starting server process')) {
              setProgress(50)
            } else if (message.includes('Waiting for server')) {
              setProgress(60)
            } else if (message.includes('Server starting')) {
              // Extract seconds from "Server starting... (X/30s)"
              const match = message.match(/\((\d+)\/30s\)/)
              if (match) {
                const seconds = parseInt(match[1])
                setProgress(60 + Math.min(35, seconds))
              }
            } else if (message.includes('Server ready')) {
              setProgress(100)
            } else if (message.includes('ERROR')) {
              setError(message)
              setProgress(0)
            }
          })
          
          return () => {
            unlisten()
          }
        }
      } catch (err) {
        console.error('Failed to setup listener:', err)
      }
    }

    setupListener()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[450px] max-w-[90vw]">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
        >
          CWorker
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-sm text-gray-500 dark:text-gray-400 mb-8"
        >
          GitHub Copilot Desktop Client
        </motion.p>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-6"
        >
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                ⚠️ Startup Error
              </p>
              <p className="text-red-600 dark:text-red-400 text-xs">
                {error}
              </p>
              <p className="text-red-500 dark:text-red-500 text-xs mt-2">
                Please ensure Node.js is installed and try again.
              </p>
            </div>
          ) : (
            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
              {status}
            </p>
          )}
        </motion.div>

        {/* Progress Bar */}
        {!error && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Loading Dots */}
        {!error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-1 mt-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
