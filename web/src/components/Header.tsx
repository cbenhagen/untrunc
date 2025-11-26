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
              <span className="logo-un">un</span>
              <span className="logo-trunc">trunc</span>
              <span className="logo-web">.web</span>
            </span>
          </div>
          
          <nav className="nav">
            <a 
              href="https://github.com/anthwlock/untrunc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link"
            >
              <GithubIcon />
              GitHub
            </a>
          </nav>
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

        .logo-un {
          color: var(--text-secondary);
        }

        .logo-trunc {
          color: var(--text-primary);
        }

        .logo-web {
          color: var(--cyan-400);
        }

        .nav {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          color: var(--text-secondary);
          font-size: 0.875rem;
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: var(--surface-1);
        }

        .nav-link svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </header>
  )
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="4" y="8" width="40" height="32" rx="4" stroke="var(--cyan-400)" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="8" stroke="var(--cyan-400)" strokeWidth="2.5" />
      <path d="M24 16v-4M24 36v-4M16 24h-4M36 24h-4" stroke="var(--amber-400)" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 18l-2-2M32 18l2-2M18 30l-2 2M32 30l2 2" stroke="var(--amber-400)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

