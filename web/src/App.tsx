import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoPlayer from './components/VideoPlayer'
import LogOutput from './components/LogOutput'
import SettingsPanel from './components/SettingsPanel'
import { useUntrunc } from './hooks/useUntrunc'
import type { RepairSettings } from './hooks/useUntrunc'

type AppState = 'idle' | 'ready' | 'processing' | 'complete' | 'error'

function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [brokenFile, setBrokenFile] = useState<File | null>(null)
  const [referenceHandle, setReferenceHandle] = useState<FileSystemFileHandle | null>(null)
  const [brokenHandle, setBrokenHandle] = useState<FileSystemFileHandle | null>(null)
  const [outputHandle, setOutputHandle] = useState<FileSystemFileHandle | null>(null)
  const [outputName, setOutputName] = useState<string | null>(null)
  const [settings, setSettings] = useState<RepairSettings>({
    skipUnknown: false,
    stepSize: 1,
    stretchVideo: false,
    keepUnknown: false,
    useDynamicStats: false,
    searchMdat: false,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [dragOver, setDragOver] = useState<'reference' | 'broken' | null>(null)

  const {
    progress,
    phase,
    logs,
    outputFile,
    isComplete,
    isFinalizing,
    error,
    isLoading,
    wasmStatus,
    wasmError,
    startRepair,
    reset,
  } = useUntrunc()

  const handleReferenceFile = useCallback((file: File, handle?: FileSystemFileHandle) => {
    setReferenceFile(file)
    setReferenceHandle(handle || null)
    if (brokenFile) setAppState('ready')
  }, [brokenFile])

  const handleBrokenFile = useCallback((file: File, handle?: FileSystemFileHandle) => {
    setBrokenFile(file)
    setBrokenHandle(handle || null)
  }, [])

  const selectOutputLocation = useCallback(async () => {
    if (!brokenFile) return
    if (!('showSaveFilePicker' in window)) {
      console.error('File System Access API not supported')
      return
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: brokenFile.name.replace(/\.[^.]+$/, '') + '_fixed.mp4',
        types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }]
      })
      setOutputHandle(handle)
      setOutputName(handle.name)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error(e)
    }
  }, [brokenFile])

  const handleStartRepair = useCallback(async () => {
    if (!referenceFile || !brokenFile || !outputHandle) return
    setAppState('processing')
    try {
      const freshRefFile = referenceHandle ? await referenceHandle.getFile() : referenceFile
      const freshBrokenFile = brokenHandle ? await brokenHandle.getFile() : brokenFile
      await startRepair(freshRefFile, freshBrokenFile, settings, outputHandle)
      setAppState('complete')
    } catch {
      setAppState('error')
    }
  }, [referenceFile, brokenFile, referenceHandle, brokenHandle, outputHandle, settings, startRepair])

  const handleReset = useCallback(() => {
    setReferenceFile(null)
    setBrokenFile(null)
    setOutputHandle(null)
    setOutputName(null)
    setAppState('idle')
    reset()
  }, [reset])

  const selectFile = async (type: 'reference' | 'broken') => {
    if ('showOpenFilePicker' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Video files', accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.3gp', '.rsv', '.RSV'] } }]
        })
        const file = await handle.getFile()
        if (type === 'reference') handleReferenceFile(file, handle)
        else handleBrokenFile(file, handle)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e)
      }
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent, type: 'reference' | 'broken') => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(type)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'reference' | 'broken') => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      if (type === 'reference') handleReferenceFile(file)
      else handleBrokenFile(file)
    }
  }, [handleReferenceFile, handleBrokenFile])

  const formatBytes = (bytes: number): string => {
    if (bytes < 1000) return `${bytes} B`
    if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} KB`
    if (bytes < 1000 * 1000 * 1000) return `${(bytes / (1000 * 1000)).toFixed(1)} MB`
    return `${(bytes / (1000 * 1000 * 1000)).toFixed(2)} GB`
  }

  const filesReady = referenceFile && brokenFile && outputHandle
  const isProcessing = appState === 'processing' || appState === 'complete' || appState === 'error'

  return (
    <div className="app">
      {/* Background Elements */}
      <BackgroundPattern />
      
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <TerminalIcon />
            <span className="logo-text">untrunc</span>
            <span className="badge">web</span>
          </div>
          <a href="https://github.com/anthwlock/untrunc" target="_blank" rel="noopener" className="github-link">
            <GithubIcon />
          </a>
        </div>
      </header>

      <main className="main">
        <div className="content">
          {/* Hero */}
          <motion.div 
            className="hero"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="title">Repair corrupted video files</h1>
            <p className="subtitle">
              Fix broken MP4, MOV, M4V, and RSV files directly in your browser.
              <br />
              No uploads. No servers. Everything runs locally on your machine.
            </p>
          </motion.div>

          {/* WASM Status */}
          {wasmStatus === 'loading' && (
            <div className="status-bar">
              <LoadingSpinner />
              <span className="mono">Loading WebAssembly module...</span>
            </div>
          )}
          
          {wasmStatus === 'error' && (
            <div className="status-bar error">
              <span className="mono">Error: {wasmError}</span>
            </div>
          )}

          {/* File Selection */}
          <AnimatePresence>
            {!isProcessing && (
              <motion.div 
                className="file-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="file-grid">
                  <button 
                    className={`file-card ${dragOver === 'reference' ? 'drag-over' : ''}`}
                    onClick={() => selectFile('reference')}
                    onDragOver={(e) => handleDragOver(e, 'reference')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'reference')}
                    data-selected={!!referenceFile}
                  >
                    <div className="file-card-header">
                      <span className="file-card-label">01</span>
                      <span className="file-card-title">Reference Video</span>
                    </div>
                    {referenceFile ? (
                      <div className="file-card-info">
                        <span className="file-card-name">{referenceFile.name}</span>
                        <span className="file-card-size mono">{formatBytes(referenceFile.size)}</span>
                      </div>
                    ) : (
                      <div className="file-card-empty">
                        <span>A working video from the same camera</span>
                        <span className="file-card-hint">{dragOver === 'reference' ? 'Drop file here' : 'Drag & drop or click to browse'}</span>
                      </div>
                    )}
                  </button>

                  <button 
                    className={`file-card ${dragOver === 'broken' ? 'drag-over' : ''}`}
                    onClick={() => selectFile('broken')}
                    onDragOver={(e) => handleDragOver(e, 'broken')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'broken')}
                    data-selected={!!brokenFile}
                  >
                    <div className="file-card-header">
                      <span className="file-card-label">02</span>
                      <span className="file-card-title">Broken Video</span>
                    </div>
                    {brokenFile ? (
                      <div className="file-card-info">
                        <span className="file-card-name">{brokenFile.name}</span>
                        <span className="file-card-size mono">{formatBytes(brokenFile.size)}</span>
                      </div>
                    ) : (
                      <div className="file-card-empty">
                        <span>The corrupted file to repair</span>
                        <span className="file-card-hint">{dragOver === 'broken' ? 'Drop file here' : 'Drag & drop or click to browse'}</span>
                      </div>
                    )}
                  </button>

                  {referenceFile && brokenFile && (
                    <button 
                      className="file-card file-card-output"
                      onClick={selectOutputLocation}
                      data-selected={!!outputHandle}
                    >
                      <div className="file-card-header">
                        <span className="file-card-label">03</span>
                        <span className="file-card-title">Save Location</span>
                      </div>
                      {outputName ? (
                        <div className="file-card-info">
                          <span className="file-card-name">{outputName}</span>
                          <span className="file-card-size mono">Ready to save</span>
                        </div>
                      ) : (
                        <div className="file-card-empty">
                          <span>Choose where to save the repaired file</span>
                          <span className="file-card-hint">Click to choose location</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {filesReady && (
                    <motion.div 
                      className="action-area"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="action-row">
                        <button
                          className={`btn btn-icon ${showSettings ? 'active' : ''}`}
                          onClick={() => setShowSettings(!showSettings)}
                          title="Advanced Options"
                          type="button"
                        >
                          <SettingsIcon />
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={handleStartRepair}
                          disabled={isLoading || wasmStatus !== 'ready'}
                        >
                          {isLoading ? (
                            <>
                              <LoadingSpinner />
                              Processing...
                            </>
                          ) : (
                            <>Start Repair</>
                          )}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <SettingsPanel
                              settings={settings}
                              onChange={setSettings}
                              disabled={isLoading}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Section */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="progress-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="progress-card">
                  <div className="progress-header">
                    <span className="progress-title mono">
                      {appState === 'complete' && isComplete ? '✓ Repair Complete' : 
                       appState === 'error' ? '✗ Error' : 
                       isFinalizing ? 'Finalizing file...' :
                       phase === 'mounting' ? 'Mounting files...' :
                       phase === 'parsing' ? 'Parsing reference video...' :
                       phase === 'repairing' ? 'Repairing video...' :
                       'Starting...'}
                    </span>
                    <span className="progress-percent mono">
                      {isFinalizing ? '—' : `${progress}%`}
                    </span>
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className={`progress-bar-fill ${isFinalizing ? 'finalizing' : ''}`}
                      style={{ width: isFinalizing ? '100%' : `${progress}%` }}
                    />
                  </div>

                  {isFinalizing && (
                    <div className="progress-finalizing mono">
                      Waiting for filesystem to flush data to disk... (this can take minutes for large files)
                    </div>
                  )}

                  {error && (
                    <div className="progress-error mono">{error}</div>
                  )}

                  {appState === 'complete' && isComplete && (
                    <div className="progress-success">
                      <span className="mono">File saved to disk successfully</span>
                      <button className="btn btn-secondary" onClick={handleReset}>
                        Repair Another
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Repaired Video Preview - only show after file is verified complete */}
          <AnimatePresence>
            {appState === 'complete' && isComplete && outputFile && (
              <motion.div 
                className="preview-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <VideoPlayer
                  file={outputFile}
                  label="Repaired Video"
                  accentColor="cyan"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logs */}
          {isProcessing && (
            <div className="logs-section">
              <button 
                className="logs-toggle"
                onClick={() => setShowLogs(!showLogs)}
              >
                <ChevronIcon expanded={showLogs} />
                <span className="mono">Output Log</span>
                {logs.length > 0 && <span className="logs-count mono">{logs.length}</span>}
              </button>
              <AnimatePresence>
                {showLogs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LogOutput logs={logs} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-text">
          Powered by <a href="https://github.com/anthwlock/untrunc">Untrunc</a> and <a href="https://ffmpeg.org/">FFmpeg</a> • 
          Runs entirely in your browser using WebAssembly
        </span>
      </footer>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: var(--space-4) var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .logo svg {
          width: 20px;
          height: 20px;
          color: var(--text-primary);
        }

        .logo-text {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .badge {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 2px 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .github-link {
          display: flex;
          padding: var(--space-2);
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }

        .github-link:hover {
          color: var(--text-primary);
          opacity: 1;
        }

        .github-link svg {
          width: 20px;
          height: 20px;
        }

        /* Main */
        .main {
          flex: 1;
          padding: var(--space-16) 0;
        }

        .content {
          max-width: 700px;
          margin: 0 auto;
          padding: 0 var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        /* Hero */
        .hero {
          text-align: center;
        }

        .title {
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.03em;
          margin-bottom: var(--space-4);
        }

        .subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Status */
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          font-size: 13px;
          color: var(--text-muted);
        }

        .status-bar.error {
          border-color: var(--error);
          color: var(--error);
        }

        .status-bar svg {
          width: 14px;
          height: 14px;
        }

        /* File Section */
        .file-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .file-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .file-card-output {
          grid-column: 1 / -1;
        }

        @media (max-width: 600px) {
          .file-grid {
            grid-template-columns: 1fr;
          }
          .file-card-output {
            grid-column: auto;
          }
        }

        .file-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-5);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
          min-height: 140px;
        }

        .file-card:hover:not(:disabled) {
          border-color: var(--border-hover);
          background: var(--bg-elevated);
        }

        .file-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-card[data-selected="true"] {
          border-color: var(--text-muted);
        }

        .file-card.drag-over {
          border-color: var(--accent);
          border-style: dashed;
          background: var(--bg-elevated);
        }

        .file-card-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .file-card-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }

        .file-card-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .file-card-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          flex: 1;
        }

        .file-card-name {
          font-size: 13px;
          color: var(--text-primary);
          word-break: break-all;
        }

        .file-card-size {
          font-size: 12px;
          color: var(--text-muted);
        }

        .file-card-empty {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
          font-size: 13px;
          color: var(--text-muted);
        }

        .file-card-hint {
          font-size: 12px;
          color: var(--text-muted);
          opacity: 0.6;
        }

        .action-area {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .action-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-3);
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-icon:hover {
          background: var(--bg-elevated);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .btn-icon.active {
          background: var(--bg-elevated);
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        .btn-icon svg {
          width: 18px;
          height: 18px;
        }

        /* Progress Section */
        .progress-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .progress-card {
          padding: var(--space-5);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-title {
          font-size: 13px;
          color: var(--text-primary);
        }

        .progress-percent {
          font-size: 13px;
          color: var(--text-muted);
        }

        .progress-error {
          font-size: 12px;
          color: var(--error);
          padding: var(--space-3);
          background: var(--error-muted);
          border-radius: var(--radius-md);
        }

        .progress-finalizing {
          font-size: 12px;
          color: var(--text-muted);
          padding: var(--space-3);
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .progress-finalizing::before {
          content: '';
          width: 12px;
          height: 12px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .progress-bar-fill.finalizing {
          background: linear-gradient(
            90deg,
            var(--accent) 0%,
            var(--accent-muted) 50%,
            var(--accent) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .progress-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--border);
          font-size: 13px;
          color: var(--success);
        }

        /* Preview Section */
        .preview-section {
          max-width: 100%;
        }

        /* Logs Section */
        .logs-section {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .logs-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--bg-card);
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .logs-toggle:hover {
          color: var(--text-secondary);
          background: var(--bg-elevated);
        }

        .logs-toggle svg {
          width: 14px;
          height: 14px;
        }

        .logs-count {
          margin-left: auto;
          font-size: 11px;
          padding: 1px 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }

        /* Footer */
        .footer {
          padding: var(--space-6);
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .footer-text {
          font-size: 13px;
          color: var(--text-muted);
        }

        .footer a {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

// Icons
function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function BackgroundPattern() {
  // MP4 file format hex signatures and technical text
  const hexColumns = [
    { left: '5%', top: '-5%', content: '00 00 00 20\n66 74 79 70\n69 73 6F 6D\n00 00 02 00\n69 73 6F 6D\n69 73 6F 32\n61 76 63 31\n6D 70 34 31\n00 00 00 08\n66 72 65 65\n00 00 00 00\n6D 64 61 74\n00 00 00 00\n00 00 00 00\n6D 6F 6F 76\n00 00 00 6C\n6D 76 68 64' },
    { left: '92%', top: '10%', content: 'ftyp isom\nmoov mvhd\ntrak tkhd\nmdia mdhd\nhdlr vide\nminf vmhd\ndinf dref\nstbl stsd\navc1 avcC\nstts stsc\nstsz stco\nfree mdat\n00 00 00 18\n66 74 79 70\n71 74 20 20' },
    { left: '3%', top: '55%', content: '00 01 02 03\n04 05 06 07\n08 09 0A 0B\n0C 0D 0E 0F\n10 11 12 13\n14 15 16 17\n18 19 1A 1B\n1C 1D 1E 1F\nFF D8 FF E0\n00 10 4A 46\n49 46 00 01' },
    { left: '88%', top: '70%', content: 'NAL UNIT\nSPS PPS\nIDR FRAME\nSLICE HDR\nMACROBLOCK\nMOTION VEC\nCOEFF DATA\nCABAC BITS\nPOC CNT\nREF IDX\nQP DELTA' },
  ]

  return (
    <>
      {/* Large centered watermark */}
      <div className="bg-watermark" aria-hidden="true">
        <div className="bg-watermark-text">UNTRUNC</div>
        <div className="bg-watermark-sub">66 74 79 70 • MP4 • MOV • M4V</div>
      </div>
      
      {/* Hex columns */}
      <div className="bg-hex-pattern" aria-hidden="true">
        {hexColumns.map((col, i) => (
          <div 
            key={i}
            className="bg-hex-column"
            style={{ left: col.left, top: col.top }}
          >
            {col.content}
          </div>
        ))}
      </div>
      
      {/* Corner accents */}
      <div className="bg-corner-accent bg-corner-accent--top-right" aria-hidden="true" />
      <div className="bg-corner-accent bg-corner-accent--bottom-left" aria-hidden="true" />
      
      {/* Film frame markers */}
      <div className="bg-film-markers" aria-hidden="true">
        <div className="bg-film-marker bg-film-marker--left" />
        <div className="bg-film-marker bg-film-marker--right" />
      </div>
      
      <style>{`
        .bg-film-markers {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: -1;
        }
        
        .bg-film-marker {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          justify-content: center;
        }
        
        .bg-film-marker::before,
        .bg-film-marker::after {
          content: '';
          display: block;
          width: 12px;
          height: 8px;
          background: rgba(255, 255, 255, 0.015);
          border-radius: 1px;
        }
        
        .bg-film-marker--left {
          left: 20px;
        }
        
        .bg-film-marker--right {
          right: 20px;
        }
        
        .bg-film-marker--left::before,
        .bg-film-marker--left::after,
        .bg-film-marker--right::before,
        .bg-film-marker--right::after {
          box-shadow: 
            0 20px 0 rgba(255, 255, 255, 0.015),
            0 40px 0 rgba(255, 255, 255, 0.015),
            0 60px 0 rgba(255, 255, 255, 0.015),
            0 80px 0 rgba(255, 255, 255, 0.015),
            0 100px 0 rgba(255, 255, 255, 0.015),
            0 120px 0 rgba(255, 255, 255, 0.015),
            0 140px 0 rgba(255, 255, 255, 0.015),
            0 -20px 0 rgba(255, 255, 255, 0.015),
            0 -40px 0 rgba(255, 255, 255, 0.015),
            0 -60px 0 rgba(255, 255, 255, 0.015),
            0 -80px 0 rgba(255, 255, 255, 0.015),
            0 -100px 0 rgba(255, 255, 255, 0.015),
            0 -120px 0 rgba(255, 255, 255, 0.015),
            0 -140px 0 rgba(255, 255, 255, 0.015);
        }
        
        @media (max-width: 900px) {
          .bg-film-markers,
          .bg-hex-column {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export default App
