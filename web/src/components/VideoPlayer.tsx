import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface VideoPlayerProps {
  file: File | Blob | null
  label: string
  accentColor?: 'cyan' | 'amber'
}

export default function VideoPlayer({ file, label }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<string>('')
  const [resolution, setResolution] = useState<string>('')

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setError(null)
      return () => URL.revokeObjectURL(url)
    } else {
      setVideoUrl(null)
      setDuration('')
      setResolution('')
    }
  }, [file])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const video = videoRef.current
      const mins = Math.floor(video.duration / 60)
      const secs = Math.floor(video.duration % 60)
      setDuration(`${mins}:${secs.toString().padStart(2, '0')}`)
      setResolution(`${video.videoWidth}×${video.videoHeight}`)
    }
  }

  const handleError = () => {
    setError('Cannot preview this video format')
  }

  if (!file) return null

  return (
    <motion.div 
      className="video-player"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="video-player-header">
        <span className="video-player-label mono">{label}</span>
        {duration && (
          <span className="video-player-meta mono">
            {resolution} • {duration}
          </span>
        )}
      </div>
      
      <div className="video-player-container">
        {error ? (
          <div className="video-player-error">
            <span className="mono">{error}</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl || undefined}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
            playsInline
          />
        )}
      </div>

      <style>{`
        .video-player {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .video-player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border);
        }

        .video-player-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .video-player-meta {
          font-size: 11px;
          color: var(--text-muted);
        }

        .video-player-container {
          position: relative;
          background: #000;
        }

        .video-player video {
          display: block;
          width: 100%;
          max-height: 300px;
          object-fit: contain;
        }

        .video-player-error {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
          color: var(--text-muted);
          font-size: 13px;
        }
      `}</style>
    </motion.div>
  )
}
