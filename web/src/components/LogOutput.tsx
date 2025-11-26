import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LogOutputProps {
  logs: string[]
}

export default function LogOutput({ logs }: LogOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const formatLog = (log: string) => {
    if (log.startsWith('Error:') || log.startsWith('error:')) {
      return <span className="log-error">{log}</span>
    }
    if (log.startsWith('Warning:') || log.startsWith('warning:')) {
      return <span className="log-warning">{log}</span>
    }
    if (log.startsWith('Info:') || log.startsWith('info:')) {
      return <span className="log-info">{log}</span>
    }
    return log
  }

  return (
    <motion.div 
      ref={containerRef}
      className="log-output"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {logs.length === 0 ? (
        <div className="log-empty">Waiting for output...</div>
      ) : (
        <div className="log-content">
          {logs.map((log, index) => (
            <div key={index} className="log-line">
              <span className="log-number">{String(index + 1).padStart(3, ' ')}</span>
              <span className="log-text">{formatLog(log)}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .log-output {
          background: var(--bg-primary);
          max-height: 300px;
          overflow-y: auto;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.6;
          padding: var(--space-3);
        }

        .log-empty {
          color: var(--text-muted);
          padding: var(--space-4);
          text-align: center;
        }

        .log-content {
          display: flex;
          flex-direction: column;
        }

        .log-line {
          display: flex;
          gap: var(--space-4);
          padding: 1px 0;
        }

        .log-line:hover {
          background: var(--bg-elevated);
        }

        .log-number {
          color: var(--text-muted);
          user-select: none;
          white-space: pre;
          opacity: 0.5;
        }

        .log-text {
          color: var(--text-secondary);
          word-break: break-all;
        }

        .log-error {
          color: var(--error);
        }

        .log-warning {
          color: var(--warning);
        }

        .log-info {
          color: var(--text-primary);
        }
      `}</style>
    </motion.div>
  )
}
