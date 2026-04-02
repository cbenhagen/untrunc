import { motion } from 'framer-motion'

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <motion.div 
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="logo">
            <LogoIcon />
            <span className="logo-text">
              <span className="logo-rest">rsv</span>
              <span className="logo-accent">.repair</span>
            </span>
          </div>
        </motion.div>
      </div>

      <style>{`
        .header {
          padding: var(--space-4) 0;
          border-bottom: 1px solid var(--surface-border);
          background: rgba(10, 12, 15, 0.8);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
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
          width: 36px;
          height: 36px;
        }

        .logo-text {
          font-family: var(--font-mono);
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .logo-rest {
          color: var(--text-primary);
        }

        .logo-accent {
          color: var(--text-secondary);
        }
      `}</style>
    </header>
  )
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="4" y="8" width="40" height="32" rx="4" stroke="var(--text-primary)" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="8" stroke="var(--text-secondary)" strokeWidth="2.5" />
      <path d="M24 16v-4M24 36v-4M16 24h-4M36 24h-4" stroke="var(--amber-400)" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 18l-2-2M32 18l2-2M18 30l-2 2M32 30l2 2" stroke="var(--amber-400)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

