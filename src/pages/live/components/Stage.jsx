import { Mic, MicOff, PhoneOff } from "lucide-react"

import { VU_IN, VU_OUT, WAVE_BARS } from "../data"
import styles from "../live.module.css"

function Meter({ meter, variant }) {
  return (
    <div className={styles.meter}>
      <div className={styles.mLabel}>
        <b>{meter.label}</b>
        <span>{meter.db}</span>
      </div>
      <div className={`${styles.vu} ${styles[variant]}`}>
        {meter.bars.map((bar, i) => (
          <span
            key={i}
            className={bar.on ? styles.on : ""}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Live stage: status pill, animated agent-output waveform, symmetric VU meters
 *  and the circular mic/mute control. Bars are static data animated via CSS. */
export default function Stage({ muted, onToggleMute }) {
  return (
    <div className={styles.stage}>
      <div className={`${styles.statusPill} ${styles.speaking}`}>
        <span className={styles.sdot} />
        Agent speaking
      </div>

      <div className={styles.wave}>
        {WAVE_BARS.map((bar, i) => (
          <span
            key={i}
            className={styles.bar}
            style={{
              height: `${bar.height}px`,
              opacity: bar.opacity,
              animationDuration: `${bar.duration}s`,
              animationDelay: `${bar.delay}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.controls}>
        <Meter meter={VU_IN} variant="in" />

        <div className={styles.micCol}>
          <button
            className={`${styles.micBtn} ${muted ? styles.muted : ""}`}
            onClick={onToggleMute}
            title={muted ? "Unmute mic" : "Mute mic"}
            type="button"
          >
            {muted ? <MicOff size={24} strokeWidth={1.7} /> : <Mic size={24} strokeWidth={1.7} />}
          </button>
          <div className={styles.micCap}>
            {muted ? "muted · tap to speak" : "tap to mute · VAD on"}
          </div>
        </div>

        <Meter meter={VU_OUT} variant="out" />
      </div>

      <div className={styles.endWrap}>
        <button className={styles.endBtn} type="button">
          <PhoneOff size={14} strokeWidth={1.8} />
          End session
        </button>
      </div>
    </div>
  )
}
