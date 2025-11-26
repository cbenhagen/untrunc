import { useState, useCallback } from 'react'

interface StreamProgress {
  bytesRead: number
  totalBytes: number
  percentage: number
}

interface FileStreamOptions {
  chunkSize?: number
  onProgress?: (progress: StreamProgress) => void
  onChunk?: (chunk: Uint8Array, offset: number) => Promise<void>
}

/**
 * Hook for streaming large files in chunks
 * Uses File System Access API where available for better performance
 */
export function useFileStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [progress, setProgress] = useState<StreamProgress>({
    bytesRead: 0,
    totalBytes: 0,
    percentage: 0,
  })

  /**
   * Stream a file in chunks
   */
  const streamFile = useCallback(async (
    file: File,
    options: FileStreamOptions = {}
  ) => {
    const {
      chunkSize = 64 * 1024 * 1024, // 64MB chunks
      onProgress,
      onChunk,
    } = options

    setIsStreaming(true)
    setProgress({ bytesRead: 0, totalBytes: file.size, percentage: 0 })

    try {
      let offset = 0
      
      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size)
        const chunk = file.slice(offset, end)
        const buffer = await chunk.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)

        if (onChunk) {
          await onChunk(uint8Array, offset)
        }

        offset = end
        const currentProgress: StreamProgress = {
          bytesRead: offset,
          totalBytes: file.size,
          percentage: (offset / file.size) * 100,
        }
        
        setProgress(currentProgress)
        if (onProgress) {
          onProgress(currentProgress)
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }, [])

  /**
   * Read entire file into memory (for smaller files)
   */
  const readFullFile = useCallback(async (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress({
            bytesRead: event.loaded,
            totalBytes: event.total,
            percentage: (event.loaded / event.total) * 100,
          })
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }, [])

  /**
   * Check if File System Access API is available
   * This allows direct file handle access for better streaming performance
   */
  const hasFileSystemAccess = useCallback((): boolean => {
    return 'showOpenFilePicker' in window
  }, [])

  /**
   * Open a file using File System Access API (Chrome/Edge only)
   * Returns a FileSystemFileHandle for streaming writes
   */
  const openFileForWrite = useCallback(async (suggestedName: string): Promise<FileSystemWritableFileStream | null> => {
    if (!hasFileSystemAccess()) return null

    try {
      const handle = await (window as typeof window & { showSaveFilePicker: (options: { suggestedName: string, types: Array<{ description: string, accept: Record<string, string[]> }> }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Video Files',
          accept: { 'video/mp4': ['.mp4', '.m4v', '.mov'] },
        }],
      })
      return handle.createWritable()
    } catch {
      // User cancelled or API not available
      return null
    }
  }, [hasFileSystemAccess])

  /**
   * Stream write to a file (for output)
   */
  const streamWrite = useCallback(async (
    writable: FileSystemWritableFileStream,
    data: Uint8Array,
    options: { onProgress?: (written: number, total: number) => void } = {}
  ) => {
    const chunkSize = 64 * 1024 * 1024 // 64MB
    let written = 0

    while (written < data.length) {
      const end = Math.min(written + chunkSize, data.length)
      const chunk = data.slice(written, end)
      await writable.write(chunk)
      written = end

      if (options.onProgress) {
        options.onProgress(written, data.length)
      }
    }

    await writable.close()
  }, [])

  return {
    isStreaming,
    progress,
    streamFile,
    readFullFile,
    hasFileSystemAccess,
    openFileForWrite,
    streamWrite,
  }
}

