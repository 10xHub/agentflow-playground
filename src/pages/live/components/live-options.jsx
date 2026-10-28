import PropTypes from "prop-types"

import styles from "../live.module.css"

export const DEFAULT_LIVE_OPTIONS = {
  voice: "",
  vadEnabled: true,
  silenceMs: "",
  systemPrompt: "",
}

const noteFor = (honored) => {
  if (honored === null) {
    return "Best effort: this server does not say which options it honors, so it may ignore any of these."
  }
  if (honored.length === 0) {
    return "This server does not accept per-session overrides. The agent's own settings are used."
  }
  return "Only options the server honors are shown."
}

const show = (honored, key) => honored === null || honored.includes(key)

/**
 * Session options (voice, VAD, system prompt) behind an Advanced disclosure.
 * @param {object} props - component props
 * @param {object} props.value - current form values
 * @param {(next: object) => void} props.onChange - called with the next values
 * @param {string[]|null} props.honored - honored option keys, null when unknown
 * @param {boolean} props.disabled - true while a session is running
 * @returns {object} the options disclosure
 */
const LiveOptions = ({ value, onChange, honored = null, disabled = false }) => {
  const set = (patch) => onChange({ ...value, ...patch })
  return (
    <details className={styles.optsWrap}>
      <summary>Advanced</summary>
      <div className={styles.optsGrid}>
        <div className={styles.optsNote}>{noteFor(honored)}</div>
        {show(honored, "voice") && (
          <label>
            Voice
            <input
              type="text"
              value={value.voice}
              disabled={disabled}
              onChange={(e) => set({ voice: e.target.value })}
            />
          </label>
        )}
        {show(honored, "vad") && (
          <>
            <label>
              <span>
                <input
                  type="checkbox"
                  checked={value.vadEnabled}
                  disabled={disabled}
                  onChange={(e) => set({ vadEnabled: e.target.checked })}
                />{" "}
                Voice activity detection
              </span>
            </label>
            <label>
              Silence before end of turn (ms)
              <input
                type="number"
                min="0"
                value={value.silenceMs}
                disabled={disabled}
                onChange={(e) => set({ silenceMs: e.target.value })}
              />
            </label>
          </>
        )}
        {show(honored, "system_prompt") && (
          <label>
            System prompt
            <textarea
              rows={3}
              value={value.systemPrompt}
              disabled={disabled}
              onChange={(e) => set({ systemPrompt: e.target.value })}
            />
          </label>
        )}
      </div>
    </details>
  )
}

LiveOptions.propTypes = {
  value: PropTypes.shape({
    voice: PropTypes.string,
    vadEnabled: PropTypes.bool,
    silenceMs: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    systemPrompt: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  honored: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.bool,
}

export default LiveOptions
