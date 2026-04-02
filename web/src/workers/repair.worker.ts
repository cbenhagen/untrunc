/**
 * Repair Worker
 * 
 * Uses WORKERFS for file reading (via Emscripten's built-in filesystem)
 * Uses SharedArrayBuffer + Atomics for TRUE synchronous backpressure on writes.
 * The main thread handles async writes while this worker blocks with Atomics.wait().
 */

interface RepairSettings {
  skipUnknown: boolean
  stepSize: number
  stretchVideo: boolean
  keepUnknown: boolean
  useDynamicStats: boolean
  searchMdat: boolean
}

interface RepairMessage {
  type: 'repair'
  referenceFile: File
  brokenFile: File
  settings: RepairSettings
  signalBuffer: SharedArrayBuffer  // For Atomics signaling
}

interface RepairResult {
  success: boolean
  error: string
  outputPath: string
}

interface EmscriptenFS {
  mkdir(path: string): void
  mount(type: unknown, opts: unknown, mountpoint: string): void
  unmount(mountpoint: string): void
  filesystems: { WORKERFS: unknown }
}

interface UntruncModule {
  FS: EmscriptenFS
  initialize: () => void
  setProgressCallback: (callback: (progress: number) => void) => void
  setLogCallback: (callback: (message: string) => void) => void
  enableStreamingWrite: () => void
  disableStreamingWrite: () => void
  flushStreamBuffer: () => void
  repair: (refPath: string, brokenPath: string, outputDir: string, settings: RepairSettings) => RepairResult
  cleanup: () => void
  // Synchronous write function using Atomics
  writeSync?: (data: Uint8Array) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any

let module: UntruncModule | null = null

// Global error handler to catch any uncaught errors
self.onerror = (message: string, source: string, lineno: number, colno: number, error: Error) => {
  sendLog(`Error: Uncaught worker error: ${message}`)
  sendLog(`Error: Source: ${source}:${lineno}:${colno}`)
  if (error?.stack) sendLog(`Error: Stack: ${error.stack}`)
  sendError(`Uncaught error: ${message}`)
}

self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
  sendLog(`Error: Unhandled promise rejection: ${reason}`)
  sendError(`Unhandled rejection: ${reason}`)
}

// Monkey-patch FileReaderSync to log when it fails
const OriginalFileReaderSync = self.FileReaderSync
let fileReaderCallCount = 0
let lastFileReaderLog = 0

self.FileReaderSync = class extends OriginalFileReaderSync {
  readAsArrayBuffer(blob: Blob): ArrayBuffer {
    fileReaderCallCount++
    
    // Log every 1000 calls
    if (fileReaderCallCount - lastFileReaderLog >= 1000) {
      sendLog(`Info: FileReaderSync calls: ${fileReaderCallCount}, blob size: ${blob.size}`)
      lastFileReaderLog = fileReaderCallCount
    }
    
    try {
      return super.readAsArrayBuffer(blob)
    } catch (e) {
      sendLog(`Error: FileReaderSync.readAsArrayBuffer failed!`)
      sendLog(`Error: Call count: ${fileReaderCallCount}`)
      sendLog(`Error: Blob size: ${blob.size}`)
      sendLog(`Error: Blob type: ${blob.type}`)
      throw e
    }
  }
}

// Phase-aware progress tracking
// Phases: mounting(0-5), parsing(5-15), repairing(15-95), finalizing(95-100)
type RepairPhase = 'mounting' | 'parsing' | 'repairing' | 'finalizing'
let currentPhase: RepairPhase = 'mounting'
let lastMappedProgress = 0
let expectedOutputSize = 0  // Set when repair starts, used for write progress

function setPhase(phase: RepairPhase) {
  currentPhase = phase
  // Don't reset lastMappedProgress - we want monotonic progress across phases
  // Notify main thread of phase change
  self.postMessage({ type: 'phase', phase })
}

function setExpectedOutputSize(size: number) {
  expectedOutputSize = size
}

// Send progress based on bytes written (for repairing phase)
function sendWriteProgress(bytesWritten: number) {
  if (currentPhase !== 'repairing' || expectedOutputSize === 0) return
  
  // Calculate write progress as percentage of expected output
  const writePercent = Math.min(100, (bytesWritten / expectedOutputSize) * 100)
  
  // Map to 15-95% range (repairing phase)
  const mappedProgress = 15 + (writePercent * 0.80)
  
  // Only send if progress actually increased
  if (mappedProgress > lastMappedProgress) {
    lastMappedProgress = mappedProgress
    self.postMessage({ type: 'progress', progress: Math.round(mappedProgress) })
  }
}

function sendProgress(rawProgress: number) {
  // Map raw 0-100 progress to the appropriate phase range
  let mappedProgress: number
  
  switch (currentPhase) {
    case 'mounting':
      // 0-5%
      mappedProgress = Math.min(5, rawProgress * 0.05)
      break
    case 'parsing':
      // 5-15% (parsing reference file is usually quick)
      mappedProgress = 5 + Math.min(10, rawProgress * 0.10)
      break
    case 'repairing':
      // During repair, C++ progress is for analysis - we prefer write progress
      // Only use this if write progress hasn't started yet
      // Map to first part of repair range (15-25%) for analysis
      mappedProgress = 15 + Math.min(10, rawProgress * 0.10)
      break
    case 'finalizing':
      // 95-100%
      mappedProgress = 95 + Math.min(5, rawProgress * 0.05)
      break
    default:
      mappedProgress = rawProgress
  }
  
  // Only send if progress actually increased (avoid backward jumps)
  if (mappedProgress > lastMappedProgress) {
    lastMappedProgress = mappedProgress
    self.postMessage({ type: 'progress', progress: Math.round(mappedProgress) })
  }
}

function sendLog(message: string) {
  // Detect phase changes from log messages
  if (message.includes('parsing reference file') || message.includes('Parsing reference')) {
    setPhase('parsing')
  } else if (message.includes('repairing:') || message.includes('Starting repair')) {
    setPhase('repairing')
  }
  
  self.postMessage({ type: 'log', message })
}

function sendComplete(outputName: string, size: number) {
  self.postMessage({ type: 'complete', outputName, size })
}

function sendError(error: string) {
  self.postMessage({ type: 'error', error })
}

async function loadModule(): Promise<UntruncModule> {
  sendLog('Info: Loading WASM module...')
  self.importScripts('/untrunc.js')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createUntruncModule = (self as any).createUntruncModule
  if (!createUntruncModule) {
    throw new Error('WASM module not found. From web/: bun run build:wasm')
  }
  
  const mod = await createUntruncModule({
    print: (text: string) => sendLog(text),
    printErr: (text: string) => sendLog(`Error: ${text}`),
    locateFile: (path: string) => path.endsWith('.wasm') ? '/untrunc.wasm' : path
  })
  
  sendLog('Info: WASM module ready')
  return mod as UntruncModule
}

async function repair(
  mod: UntruncModule, 
  refFile: File, 
  brokenFile: File, 
  settings: RepairSettings, 
  signalBuffer: SharedArrayBuffer
): Promise<void> {
  mod.initialize()
  mod.setProgressCallback(sendProgress)
  mod.setLogCallback(sendLog)

  // Writes are handled by main thread - worker just sends data via postMessage
  // and blocks with Atomics until main thread confirms the write is done
  let bytesWritten = 0
  
  // Signal array: [0] = status (0=idle, 1=writing, 2=done, -1=error)
  const signalArray = new Int32Array(signalBuffer)

  // Called from C++ via EM_JS (wasmWriteSync). Not Emscripten Asyncify:
  // we block here with Atomics until the main thread completes writable.write().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mod as any).writeSync = (data: Uint8Array): void => {
    // Post chunk to main thread; it awaits writable.write() then notifies us
    // Transfer the underlying buffer for efficiency (zero-copy)
    const copy = new Uint8Array(data)  // Must copy since data is a view into WASM memory
    
    // Signal that we're starting a write
    Atomics.store(signalArray, 0, 1)
    
    // Post data to main thread
    self.postMessage({ 
      type: 'write-request', 
      data: copy.buffer,
      size: copy.byteLength 
    }, [copy.buffer])
    
    // BLOCK until main thread signals completion (after its writable.write Promise)
    while (true) {
      const result = Atomics.wait(signalArray, 0, 1, 30000) // 30s timeout
      const status = Atomics.load(signalArray, 0)
      
      if (status === 2) {
        // Write completed successfully
        bytesWritten += data.byteLength
        
        // Update progress based on bytes written (this is the real progress for large files)
        sendWriteProgress(bytesWritten)
        
        // Log every 5GB (progress bar shows the real progress now)
        const LOG_INTERVAL = 5 * 1000 * 1000 * 1000  // 5 GB
        if (Math.floor(bytesWritten / LOG_INTERVAL) > Math.floor((bytesWritten - data.byteLength) / LOG_INTERVAL)) {
          sendLog(`Info: Written ${formatBytes(bytesWritten)}...`)
        }
        
        // Reset signal for next write
        Atomics.store(signalArray, 0, 0)
        return
      } else if (status === -1) {
        // Error occurred
        Atomics.store(signalArray, 0, 0)
        throw new Error('Write failed on main thread')
      } else if (result === 'timed-out') {
        sendLog(`Warning: Write timeout, retrying...`)
        // Continue waiting
      }
    }
  }

  // Enable streaming write mode
  mod.enableStreamingWrite()

  // Log file sizes
  const LARGE_FILE_THRESHOLD = 10 * 1000 * 1000 * 1000  // 10 GB
  if (brokenFile.size > LARGE_FILE_THRESHOLD) {
    sendLog(`Info: Large file detected (${formatBytes(brokenFile.size)})`)
  }

  try { mod.FS.mkdir('/ref') } catch {}
  try { mod.FS.mkdir('/broken') } catch {}

  sendLog(`Info: Reference: ${refFile.name} (${formatBytes(refFile.size)})`)
  sendLog(`Info: .rsv: ${brokenFile.name} (${formatBytes(brokenFile.size)})`)
  
  // Reset phase tracking and set expected output size for progress calculation
  // Output size is approximately the broken file size (might be slightly different)
  setExpectedOutputSize(brokenFile.size)
  lastMappedProgress = 0
  setPhase('mounting')
  sendLog('Info: Mounting files...')
  sendProgress(50) // 50% of mounting phase = 2.5% overall

  mod.FS.mount(mod.FS.filesystems.WORKERFS, { files: [refFile] }, '/ref')
  mod.FS.mount(mod.FS.filesystems.WORKERFS, { files: [brokenFile] }, '/broken')

  sendProgress(100) // 100% of mounting phase = 5% overall
  sendLog('Info: Starting…')
  
  let result: RepairResult
  try {
    result = mod.repair(`/ref/${refFile.name}`, `/broken/${brokenFile.name}`, '/tmp', settings)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    sendLog(`Error: ${error}`)
    sendLog(`Error: This typically happens when the browser loses access to the file after extended time.`)
    sendLog(`Error: Written so far: ${formatBytes(bytesWritten)}`)
    sendLog(`Error: For large .rsv files, use the command-line tool with your reference clip and .rsv file.`)
    throw e
  }

  // FileWrite destructor already flushes remaining data
  
  // Cleanup
  mod.disableStreamingWrite()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (mod as any).writeSync

  try { mod.FS.unmount('/ref') } catch {}
  try { mod.FS.unmount('/broken') } catch {}

  // Signal main thread to close the output stream
  // IMPORTANT: Set signal to 1 BEFORE posting message to avoid race condition
  setPhase('finalizing')
  sendProgress(0) // Start of finalizing = 95%
  sendLog('Info: Closing output file...')
  Atomics.store(signalArray, 0, 1)
  self.postMessage({ type: 'close-stream' })
  
  // Wait for main thread to signal completion (value changes from 1)
  // 10 minute timeout - large files can take a LONG time to fsync
  const waitResult = Atomics.wait(signalArray, 0, 1, 600000)
  const closeStatus = Atomics.load(signalArray, 0)
  
  if (waitResult === 'timed-out') {
    sendLog('Warning: Timed out waiting for file close (10 min)')
  } else if (closeStatus !== 2) {
    sendLog(`Warning: Stream close returned status ${closeStatus}`)
  } else {
    sendLog('Info: File saved successfully')
  }

  if (!result.success) {
    throw new Error(result.error || 'Recovery failed')
  }

  mod.cleanup()
  
  sendProgress(100) // 100% of finalizing = 100% overall
  sendLog(`Info: Complete! Written ${formatBytes(bytesWritten)}`)
  sendComplete(brokenFile.name + '_fixed.mp4', bytesWritten)
}

self.onmessage = async (event: MessageEvent<RepairMessage | { type: 'preload' }>) => {
  const data = event.data

  if (data.type === 'preload') {
    try {
      if (!module) module = await loadModule()
      self.postMessage({ type: 'preload-complete' })
    } catch (error) {
      self.postMessage({ type: 'preload-error', error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  const { referenceFile, brokenFile, settings, signalBuffer } = data as RepairMessage

  try {
    if (!module) module = await loadModule()
    await repair(module, referenceFile, brokenFile, settings, signalBuffer)
  } catch (error) {
    sendError(error instanceof Error ? error.message : String(error))
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} KB`
  if (bytes < 1000 * 1000 * 1000) return `${(bytes / (1000 * 1000)).toFixed(1)} MB`
  return `${(bytes / (1000 * 1000 * 1000)).toFixed(2)} GB`
}
