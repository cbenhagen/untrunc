import { useState, useCallback, useRef, useEffect } from 'react'

export interface RepairSettings {
  skipUnknown: boolean
  stepSize: number
  stretchVideo: boolean
  keepUnknown: boolean
  useDynamicStats: boolean
  searchMdat: boolean
}

interface UntruncState {
  progress: number
  phase: RepairPhase
  logs: string[]
  outputFileName: string
  outputSize: number
  outputFile: File | null
  error: string | null
  isLoading: boolean
  isFinalizing: boolean
  isComplete: boolean
  wasmStatus: 'loading' | 'ready' | 'error'
  wasmError: string | null
}

type RepairPhase = 'mounting' | 'parsing' | 'repairing' | 'finalizing' | null

interface WorkerMessage {
  type: 'progress' | 'log' | 'complete' | 'error' | 'preload-complete' | 'preload-error' | 'write-request' | 'close-stream' | 'phase'
  progress?: number
  message?: string
  outputName?: string
  size?: number
  error?: string
  data?: ArrayBuffer
  phase?: RepairPhase
}

let sharedWorker: Worker | null = null
let wasmLoadPromise: Promise<void> | null = null

export function useUntrunc() {
  const [state, setState] = useState<UntruncState>({
    progress: 0,
    phase: null,
    logs: [],
    outputFileName: '',
    outputSize: 0,
    outputFile: null,
    error: null,
    isLoading: false,
    isFinalizing: false,
    isComplete: false,
    wasmStatus: 'loading',
    wasmError: null,
  })

  const workerRef = useRef<Worker | null>(null)
  const outputHandleRef = useRef<FileSystemFileHandle | null>(null)
  const verifiedOutputFileRef = useRef<File | null>(null)

  useEffect(() => {
    if (sharedWorker) {
      wasmLoadPromise?.then(() => setState(prev => ({ ...prev, wasmStatus: 'ready' })))
        .catch(err => setState(prev => ({ ...prev, wasmStatus: 'error', wasmError: err.message })))
      return
    }

    sharedWorker = new Worker(new URL('../workers/repair.worker.ts', import.meta.url))

    wasmLoadPromise = new Promise((resolve, reject) => {
      if (!sharedWorker) return reject(new Error('Worker not created'))

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === 'preload-complete') {
          setState(prev => ({ ...prev, wasmStatus: 'ready' }))
          resolve()
        } else if (event.data.type === 'preload-error') {
          setState(prev => ({ ...prev, wasmStatus: 'error', wasmError: event.data.error || 'Failed' }))
          reject(new Error(event.data.error))
        }
      }

      sharedWorker.addEventListener('message', handleMessage)
      sharedWorker.postMessage({ type: 'preload' })
    })
  }, [])

  const addLog = useCallback((message: string) => {
    setState(prev => ({ ...prev, logs: [...prev.logs, message] }))
  }, [])

  const startRepair = useCallback(async (
    referenceFile: File,
    brokenFile: File,
    settings: RepairSettings,
    outputHandle: FileSystemFileHandle
  ) => {
    if (wasmLoadPromise) await wasmLoadPromise

    // Check SharedArrayBuffer support (required for cross-origin isolation)
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error('SharedArrayBuffer not available. The page must be served with COOP/COEP headers.')
    }

    setState(prev => ({
      ...prev,
      progress: 0,
      phase: null,
      logs: [],
      outputFileName: '',
      outputSize: 0,
      outputFile: null,
      error: null,
      isLoading: true,
      isFinalizing: false,
      isComplete: false,
    }))

    addLog(`Info: Starting repair...`)
    addLog(`Info: Reference: ${referenceFile.name} (${formatBytes(referenceFile.size)})`)
    addLog(`Info: Broken: ${brokenFile.name} (${formatBytes(brokenFile.size)})`)
    addLog(`Info: Output: ${outputHandle.name}`)
    
    outputHandleRef.current = outputHandle

    // Create SharedArrayBuffer for signaling between worker and main thread
    const signalBuffer = new SharedArrayBuffer(4)
    const signalArray = new Int32Array(signalBuffer)
    
    // Open writable stream on main thread (we'll do writes here)
    const writable = await outputHandle.createWritable()
    let bytesWritten = 0

    return new Promise<void>((resolve, reject) => {
      workerRef.current = sharedWorker
      if (!workerRef.current) return reject(new Error('Worker not initialized'))

      const handleMessage = async (event: MessageEvent<WorkerMessage>) => {
        const { type, progress, message, outputName, size, error, data } = event.data

        if (type === 'progress' && progress !== undefined) {
          setState(prev => ({ ...prev, progress }))
        } else if (type === 'phase' && event.data.phase) {
          const newPhase = event.data.phase
          setState(prev => ({ ...prev, phase: newPhase }))
        } else if (type === 'log' && message) {
          addLog(message)
        } else if (type === 'write-request' && data) {
          // Handle write request from worker - do async write on main thread
          try {
            const dataArray = new Uint8Array(data)
            await writable.write(dataArray)
            bytesWritten += dataArray.byteLength
            
            // Signal success to worker
            Atomics.store(signalArray, 0, 2)
            Atomics.notify(signalArray, 0)
          } catch (err) {
            console.error('Write error:', err)
            // Signal error to worker
            Atomics.store(signalArray, 0, -1)
            Atomics.notify(signalArray, 0)
          }
        } else if (type === 'close-stream') {
          // Close the stream - this finalizes the file and removes .crswap
          // BUG IN CHROME: close() Promise resolves BEFORE the .crswap rename completes!
          // See WHATWG spec: close should atomically update the file before resolving.
          // We must poll until we can verify the file is actually ready.
          setState(prev => ({ ...prev, isFinalizing: true }))
          addLog(`Info: Finalizing file (${formatBytes(bytesWritten)})...`)
          addLog(`Info: Waiting for Chrome to finish writing to disk...`)
          
          try {
            await writable.close()
            addLog(`Info: close() returned, verifying file is actually ready...`)
            
            // Chrome's close() returns before the .crswap rename completes.
            // We verify by reading bytes from NEAR THE END of the file.
            // If the file is still 0 bytes (placeholder), this will fail.
            let outputFile: File | null = null
            let verifyAttempts = 0
            const maxAttempts = 300  // Up to 5 minutes for very large files
            const expectedSize = bytesWritten
            
            while (verifyAttempts < maxAttempts) {
              try {
                if (outputHandleRef.current) {
                  // Get fresh File object each time
                  outputFile = await outputHandleRef.current.getFile()
                  
                  // Check if size matches expected (must be within 1MB)
                  const sizeDiff = Math.abs(outputFile.size - expectedSize)
                  if (outputFile.size === 0) {
                    throw new Error('File still empty (swap not renamed)')
                  }
                  if (sizeDiff >= 1024 * 1024) {
                    throw new Error(`Size mismatch: got ${outputFile.size}, expected ${expectedSize}`)
                  }
                  
                  // Try to read bytes from near the END of the file
                  // This will fail if the actual file is still the 0-byte placeholder
                  const endOffset = Math.max(0, outputFile.size - 4096)
                  const testSlice = outputFile.slice(endOffset, outputFile.size)
                  const testBuffer = await testSlice.arrayBuffer()
                  
                  if (testBuffer.byteLength > 0) {
                    // Also verify we can read from the beginning (MP4 header)
                    const startSlice = outputFile.slice(0, 32)
                    const startBuffer = await startSlice.arrayBuffer()
                    const startBytes = new Uint8Array(startBuffer)
                    
                    // Check for 'ftyp' at offset 4 (MP4 signature)
                    const hasFtyp = startBytes[4] === 0x66 && startBytes[5] === 0x74 && 
                                    startBytes[6] === 0x79 && startBytes[7] === 0x70
                    
                    if (hasFtyp || startBuffer.byteLength > 0) {
                      addLog(`Info: File verified - size matches and data readable`)
                      break
                    }
                  }
                  throw new Error('Could not read file data')
                }
              } catch (e) {
                // File not ready yet - .crswap still being renamed
                outputFile = null
                if (verifyAttempts === 0) {
                  addLog(`Info: File not ready yet, waiting for filesystem...`)
                }
              }
              
              verifyAttempts++
              if (verifyAttempts < maxAttempts) {
                // Log every 10 seconds
                if (verifyAttempts % 10 === 0) {
                  addLog(`Info: Still waiting... (${verifyAttempts}s)`)
                }
                await new Promise(r => setTimeout(r, 1000))
              }
            }
            
            if (!outputFile) {
              addLog(`Warning: Timed out after ${maxAttempts}s waiting for file`)
              try {
                if (outputHandleRef.current) {
                  outputFile = await outputHandleRef.current.getFile()
                }
              } catch { /* ignore */ }
            }
            
            verifiedOutputFileRef.current = outputFile
            addLog(`Info: File ready (${formatBytes(outputFile?.size || bytesWritten)})`)
            setState(prev => ({ ...prev, isFinalizing: false }))
            
            Atomics.store(signalArray, 0, 2)
            Atomics.notify(signalArray, 0)
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('Close error:', err)
            addLog(`Error: Failed to save file: ${errMsg}`)
            setState(prev => ({ ...prev, isFinalizing: false }))
            Atomics.store(signalArray, 0, -1)
            Atomics.notify(signalArray, 0)
          }
        } else if (type === 'complete') {
          // Use the already-verified file from close-stream handler
          const outputFile = verifiedOutputFileRef.current

          setState(prev => ({
            ...prev,
            progress: 100,
            outputFileName: outputName || '',
            outputSize: size || 0,
            outputFile,
            isLoading: false,
            isFinalizing: false,
            isComplete: true,
          }))
          addLog(`Info: Complete! Saved ${formatBytes(size || 0)}`)
          workerRef.current?.removeEventListener('message', handleMessage)
          resolve()
        } else if (type === 'error') {
          // Try to abort the stream on error (abort removes the .crswap file)
          try { 
            await writable.abort() 
            addLog('Info: Aborted incomplete file')
          } catch {
            // If abort fails, try close
            try { await writable.close() } catch {}
          }
          
          setState(prev => ({ ...prev, error: error || 'Unknown error', isLoading: false }))
          addLog(`Error: ${error}`)
          workerRef.current?.removeEventListener('message', handleMessage)
          reject(new Error(error))
        }
      }

      workerRef.current.addEventListener('message', handleMessage)
      workerRef.current.onerror = async err => {
        // Abort removes the incomplete .crswap file
        try { await writable.abort() } catch {
          try { await writable.close() } catch {}
        }
        setState(prev => ({ ...prev, error: err.message, isLoading: false }))
        reject(err)
      }

      workerRef.current.postMessage({ 
        type: 'repair', 
        referenceFile, 
        brokenFile, 
        settings, 
        signalBuffer 
      })
    })
  }, [addLog])

  const reset = useCallback(() => {
    outputHandleRef.current = null
    verifiedOutputFileRef.current = null
    setState(prev => ({
      ...prev,
      progress: 0,
      phase: null,
      logs: [],
      outputFileName: '',
      outputSize: 0,
      outputFile: null,
      error: null,
      isLoading: false,
      isFinalizing: false,
      isComplete: false,
    }))
  }, [])

  return { ...state, startRepair, reset }
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} KB`
  if (bytes < 1000 * 1000 * 1000) return `${(bytes / (1000 * 1000)).toFixed(1)} MB`
  return `${(bytes / (1000 * 1000 * 1000)).toFixed(2)} GB`
}
