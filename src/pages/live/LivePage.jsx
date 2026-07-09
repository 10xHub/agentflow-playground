import { MicOff, WifiOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useConnection } from "@/lib/connection/ConnectionContext"

import LiveSession from "./components/LiveSession"
import styles from "./live.module.css"

// Full-width centered state panel for the unavailable/not-connected cases; the
// live-capable case renders <LiveSession/> instead.
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
    const notLiveBody = (
      <span>
        The connected agent <code>{active?.name || "backend"}</code> isn&apos;t
        a realtime (live) agent, so there&apos;s no audio session to run here.
      </span>
    )
    return (
      <Gate
        icon={MicOff}
        title="Live not available for this agent"
        body={notLiveBody}
        note="To use Live, connect an agent whose graph exposes a live node (e.g. a Gemini live model). Live sessions run over the /v1/graph/live WebSocket, which only realtime agents accept."
      />
    )
  }

  // Live-capable agent — drive a real realtime session over /v1/graph/live.
  return <LiveSession />
}

export default LivePage
