import { useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FileDropZoneProps {
  label: string
  description: string
  file: File | null
  onFileSelect: (file: File, handle?: FileSystemFileHandle) => void
  accept?: string
  icon?: 'reference' | 'broken'
  disabled?: boolean
}

export default function FileDropZone({
  label,
  description,
  file,
  onFileSelect,
  accept = 'video/*',
  icon = 'reference',
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      // Drag-drop gives File, not handle - still works but may fail for very large files
      onFileSelect(droppedFile)
    }
  }, [disabled, onFileSelect])

  const handleClick = useCallback(async () => {
    if (disabled) return
    
    // Prefer File System Access API for better large file support
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Video files',
            accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.3gp', '.rsv', '.RSV'] }
          }]
        })
        const file = await handle.getFile()
        onFileSelect(file, handle)
        return
      } catch (e) {
        // User cancelled or API not available
        if ((e as Error).name === 'AbortError') return
      }
    }
    
    // Fallback to traditional file input
    inputRef.current?.click()
  }, [disabled, onFileSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }, [onFileSelect])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <motion.div
      className={`dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file-info"
            className="file-info"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="file-icon-wrapper">
              <FileIcon />
              <div className="file-check">
                <CheckIcon />
              </div>
            </div>
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="drop-prompt"
            className="drop-prompt"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="drop-icon">
              {icon === 'reference' ? <ReferenceIcon /> : <BrokenIcon />}
            </div>
            <span className="drop-label">{label}</span>
            <span className="drop-description">{description}</span>
            <span className="drop-hint">
              {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .dropzone {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: var(--space-6);
          background: var(--bg-secondary);
          border: 2px dashed var(--surface-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          overflow: hidden;
        }

        .dropzone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, var(--highlight-glow) 0%, transparent 70%);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .dropzone:hover:not(.disabled) {
          border-color: var(--highlight-border);
          background: var(--bg-tertiary);
        }

        .dropzone:hover:not(.disabled)::before {
          opacity: 1;
        }

        .dropzone.dragging {
          border-color: var(--text-secondary);
          border-style: solid;
          background: var(--bg-tertiary);
        }

        .dropzone.dragging::before {
          opacity: 1;
        }

        .dropzone.has-file {
          border-color: var(--text-secondary);
          border-style: solid;
        }

        .dropzone.has-file::before {
          background: radial-gradient(circle at center, var(--highlight-glow) 0%, transparent 70%);
          opacity: 1;
        }

        .dropzone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .drop-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .drop-icon {
          width: 48px;
          height: 48px;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
        }

        .drop-icon svg {
          width: 100%;
          height: 100%;
        }

        .drop-label {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .drop-description {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .drop-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: var(--space-2);
        }

        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .file-icon-wrapper {
          position: relative;
          width: 48px;
          height: 48px;
        }

        .file-icon-wrapper svg {
          width: 100%;
          height: 100%;
          color: var(--text-primary);
        }

        .file-check {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          background: var(--text-secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-check svg {
          width: 12px;
          height: 12px;
          color: var(--bg-primary);
        }

        .file-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .file-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          word-break: break-all;
          max-width: 180px;
        }

        .file-size {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
        }
      `}</style>
    </motion.div>
  )
}

function ReferenceIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="36" height="36" rx="4" />
      <circle cx="24" cy="24" r="8" />
      <path d="M24 16v-4M24 36v-4M16 24h-4M36 24h-4" />
      <path d="M21 21l6 6M27 21l-6 6" strokeWidth="1.5" />
    </svg>
  )
}

function BrokenIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="36" height="36" rx="4" />
      <path d="M14 24h20" />
      <path d="M18 18l-4 12M30 18l4 12" />
      <circle cx="24" cy="32" r="2" fill="currentColor" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <polygon points="10,12 10,18 15,15 10,12" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}
