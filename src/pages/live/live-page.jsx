import { MicOff, WifiOff } from "lucide-react"
import PropTypes from "prop-types"
import { useNavigate } from "react-router-dom"

import { useConnection } from "@/lib/connection/connection-context"

import LiveSession from "./components/live-session"
import { getHonoredLiveOptions } from "./live-options-source"
import styles from "./live.module.css"

// Full-width centered state panel for the unavailable/not-connected cases; the
// live-capable case renders <LiveSession/> instead.
/**
 *
 */
const Gate = ({
  icon: Icon,
  title,
  body,
  note = null,
  action = null,
  onAction = null,
}) => (
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

Gate.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.node.isRequired,
  body: PropTypes.node.isRequired,
  note: PropTypes.node,
  action: PropTypes.node,
  onAction: PropTypes.func,
}

/**
 *
 */
export const LivePage = () => {
  const navigate = useNavigate()
  const { isConnected, isDemo, capabilities, active, info } = useConnection()
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

  // Live voice streams audio to a realtime model, which a recording cannot stand in for.
  if (isDemo) {
    return (
      <Gate
        icon={MicOff}
        title="Live needs a live server"
        body="Live voice streams audio to a realtime model over the /v1/graph/live WebSocket, so it is not part of the recorded demo."
        note="Run 10xGraph with a realtime agent (for example a Gemini live model) to try it."
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
  return <LiveSession honored={getHonoredLiveOptions(info)} />
}

export default LivePage
