import { AudioLines, ArrowRight, Radio } from "lucide-react"
import { useNavigate } from "react-router-dom"

import styles from "../chat.module.css"

// Shown on the Chat page when the connected graph is a realtime (live) agent. Turn-based
// chat (invoke/stream/ws) is rejected for live graphs by the server, so rather than let the
// composer surface a raw error, we explain the situation and route to the Live page.
/**
 *
 */
export default function RealtimeGate({ agentName }) {
  const navigate = useNavigate()
  const name = agentName || "This agent"

  return (
    <div className={styles.rtGate}>
      <div className={styles.rtCard}>
        <div className={styles.rtEmblem} aria-hidden="true">
          <AudioLines size={26} strokeWidth={1.7} />
          <span className={styles.rtWaves}>
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>

        <h2 className={styles.rtTitle}>This agent runs in realtime</h2>
        <p className={styles.rtBody}>
          <code className={styles.rtCode}>{name}</code> is a live,
          audio-to-audio agent. Turn-based chat isn&apos;t available for
          realtime graphs, so there&apos;s nothing to send here.
        </p>

        <div className={styles.rtActions}>
          <button
            type="button"
            className={styles.rtPrimary}
            onClick={() => navigate("/live")}
          >
            <Radio size={15} strokeWidth={1.9} />
            Open Live session
            <ArrowRight size={15} strokeWidth={1.9} />
          </button>
        </div>

        <p className={styles.rtHelp}>
          Want turn-based chat instead? Point <code>agent</code> at a non-live
          graph (e.g. <code>graph.react:app</code>) in{" "}
          <code>agentflow.json</code>, then reconnect.
        </p>
      </div>
    </div>
  )
}
