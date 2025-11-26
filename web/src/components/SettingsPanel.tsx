import { motion } from 'framer-motion'
import type { RepairSettings } from '../hooks/useUntrunc'

interface SettingsPanelProps {
  settings: RepairSettings
  onChange: (settings: RepairSettings) => void
  disabled?: boolean
}

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const updateSetting = <K extends keyof RepairSettings>(key: K, value: RepairSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <motion.div 
      className="settings-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="settings-list">
        <ToggleSetting
          label="Skip unknown sequences"
          description="Continue past unrecognized data instead of stopping"
          checked={settings.skipUnknown}
          onChange={(v) => updateSetting('skipUnknown', v)}
          disabled={disabled}
        />

        {settings.skipUnknown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NumberSetting
              label="Step size"
              description="Number of bytes to skip at a time"
              value={settings.stepSize}
              onChange={(v) => updateSetting('stepSize', v)}
              min={1}
              max={65536}
              disabled={disabled}
            />
          </motion.div>
        )}

        <ToggleSetting
          label="Stretch video"
          description="Adjust video timing to match audio duration (experimental)"
          checked={settings.stretchVideo}
          onChange={(v) => updateSetting('stretchVideo', v)}
          disabled={disabled}
        />

        <ToggleSetting
          label="Keep unknown sequences"
          description="Include unrecognized data in output instead of discarding"
          checked={settings.keepUnknown}
          onChange={(v) => updateSetting('keepUnknown', v)}
          disabled={disabled}
        />

        <ToggleSetting
          label="Dynamic chunk stats"
          description="Use chunk pattern statistics from reference for better recovery"
          checked={settings.useDynamicStats}
          onChange={(v) => updateSetting('useDynamicStats', v)}
          disabled={disabled}
        />

        <ToggleSetting
          label="Search for mdat"
          description="Brute-force search for video data when file structure is damaged"
          checked={settings.searchMdat}
          onChange={(v) => updateSetting('searchMdat', v)}
          disabled={disabled}
        />
      </div>

      <style>{`
        .settings-panel {
          margin-top: var(--space-4);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .settings-list {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </motion.div>
  )
}

interface ToggleSettingProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSetting({ label, description, checked, onChange, disabled }: ToggleSettingProps) {
  return (
    <label className={`setting-row ${disabled ? 'disabled' : ''}`}>
      <div className="setting-content">
        <span className="setting-label">{label}</span>
        <span className="setting-description">{description}</span>
      </div>
      <button 
        className={`switch ${checked ? 'on' : ''}`}
        onClick={(e) => { e.preventDefault(); !disabled && onChange(!checked) }}
        disabled={disabled}
        type="button"
        role="switch"
        aria-checked={checked}
      >
        <span className="switch-thumb" />
      </button>

      <style>{`
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }

        .setting-row:first-child {
          padding-top: 0;
        }

        .setting-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .setting-row.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .setting-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .setting-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .setting-description {
          font-size: 12px;
          color: var(--text-muted);
        }

        .switch {
          position: relative;
          width: 36px;
          height: 20px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
          padding: 0;
        }

        .switch:hover:not(:disabled) {
          border-color: var(--border-hover);
        }

        .switch.on {
          background: var(--text-primary);
          border-color: var(--text-primary);
        }

        .switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          background: var(--text-muted);
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .switch.on .switch-thumb {
          transform: translateX(16px);
          background: var(--bg-primary);
        }
      `}</style>
    </label>
  )
}

interface NumberSettingProps {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

function NumberSetting({ label, description, value, onChange, min = 1, max = 65536, disabled }: NumberSettingProps) {
  return (
    <div className={`setting-row number-row ${disabled ? 'disabled' : ''}`}>
      <div className="setting-content">
        <span className="setting-label">{label}</span>
        <span className="setting-description">{description}</span>
      </div>
      <input
        type="number"
        className="number-input mono"
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        min={min}
        max={max}
        disabled={disabled}
      />

      <style>{`
        .number-row {
          padding-left: var(--space-4);
          margin-left: var(--space-2);
          border-left: 1px solid var(--border);
          border-bottom: none;
        }

        .number-input {
          width: 72px;
          height: 28px;
          padding: 0 var(--space-2);
          font-size: 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          text-align: right;
        }

        .number-input:focus {
          outline: none;
          border-color: var(--text-muted);
        }

        .number-input::-webkit-inner-spin-button,
        .number-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .number-input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}
