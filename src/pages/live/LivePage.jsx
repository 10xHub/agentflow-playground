import { MicOff, Radio, WifiOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useConnection } from "@/lib/connection/ConnectionContext"

import styles from "./live.module.css"

// Full-width centered state panel. The real audio-to-audio session UI is
// deferred; until then Live only ever shows an honest availability state, never
// the old dummy waveform/transcript mock (Stage/Transcript/SessionPanel are kept
// on disk for that future build).
function Gate({ icon: Icon, title, body, note, action, onAction }) {
  return (
    <div className={styles.gate}>
      <div className={styles.gateInner}>
        <Icon size={30} strokeWidth={1.5} className={styles.gateIcon} />
        <h2>{title}</h2>
        <p>{body}</p>
        {note && <p className={styles.gateNote}>{note}</p>}
        {action && (
          <button type="button" className={styles.gateBtn} onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </div>
  )
}

export function LivePage() {
  const navigate = useNavigate()
  const { isConnected, capabilities, active } = useConnection()
  const liveSupported = Boolean(
    capabilities?.find((c) => c.name === "live")?.on
  )

  // Not connected to any backend yet.
  if (!isConnected) {
    return (
      <Gate
        icon={WifiOff}
        title="Not connected"
        body="Connect a backend to start a live session."
        action="Connect a backend"
        onAction={() => navigate("/")}
      />
    )
  }

  // Connected, but this agent is not a realtime (live) agent.
  if (!liveSupported) {
    return (
      <Gate
        icon={MicOff}
        title="Live not available for this agent"
        body={
          <span>
            The connected agent <code>{active?.name || "backend"}</code>{" "}
            isn&apos;t a realtime (live) agent, so there&apos;s no audio session
            to run here.
          </span>
        }
        note="To use Live, connect an agent whose graph exposes a live node (e.g. a Gemini live model). Live sessions run over the /v1/graph/live WebSocket, which only realtime agents accept."
      />
    )
  }

  // Live-capable agent — real audio session UI is deferred for now.
  return (
    <Gate
      icon={Radio}
      title="Live-capable agent"
      body="This agent supports realtime audio sessions. The live session UI is coming soon."
    />
  )
}

export default LivePage
