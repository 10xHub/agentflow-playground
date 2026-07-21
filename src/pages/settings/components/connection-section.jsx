import {
  AlertTriangle,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  Unplug,
} from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { useConnection } from "@/lib/connection/connection-context"

import styles from "../settings.module.css"

/**
 *
 */
const hostLabel = (url) => {
  try {
    return new URL(url).host
  } catch {
    return url || "—"
  }
}

const connShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  backendUrl: PropTypes.string,
  authMode: PropTypes.string,
})

const probeShape = PropTypes.shape({
  latencyMs: PropTypes.number,
  nodes: PropTypes.number,
  edges: PropTypes.number,
})

const capabilitiesShape = PropTypes.arrayOf(
  PropTypes.shape({
    name: PropTypes.string.isRequired,
    detail: PropTypes.string,
    on: PropTypes.bool,
  })
)

/**
 *
 */
const ProbeMeta = ({ probe = null, isConnected = false }) => {
  if (!isConnected || !probe) return null
  return (
    <div className={styles.acMeta}>
      pong · {probe.latencyMs}ms
      {probe.nodes != null && ` · ${probe.nodes} nodes · ${probe.edges} edges`}
    </div>
  )
}

ProbeMeta.propTypes = {
  probe: probeShape,
  isConnected: PropTypes.bool,
}

/**
 *
 */
const CapabilityChips = ({ capabilities = null }) => {
  if (!capabilities) return null
  return (
    <div className={styles.caps}>
      {capabilities.map((c) => (
        <span
          key={c.name}
          title={c.detail}
          className={`${styles.cap} ${c.on ? "" : styles.capOff}`}
        >
          {c.name}
        </span>
      ))}
    </div>
  )
}

CapabilityChips.propTypes = {
  capabilities: capabilitiesShape,
}

/**
 *
 */
const ConnectionError = ({ status = null, error = null }) => {
  if (status !== "error" || !error) return null
  return (
    <div className={styles.err}>
      <AlertTriangle size={13} /> {error}
    </div>
  )
}

ConnectionError.propTypes = {
  status: PropTypes.string,
  error: PropTypes.string,
}

/**
 *
 */
const ActiveConnectionActions = ({
  connecting = false,
  isConnected = false,
  onReverify,
  onDisconnect,
  onEdit,
}) => (
  <div className={styles.acActions}>
    <button
      className={styles.btn}
      onClick={onReverify}
      disabled={connecting}
      type="button"
    >
      <RefreshCw size={13} /> {connecting ? "Verifying…" : "Re-verify"}
    </button>
    {isConnected && (
      <button className={styles.btn} onClick={onDisconnect} type="button">
        <Unplug size={13} /> Disconnect
      </button>
    )}
    <button
      className={`${styles.btn} ${styles.btnPrimary}`}
      onClick={onEdit}
      type="button"
    >
      <Plus size={13} /> Add / edit connection
    </button>
  </div>
)

ActiveConnectionActions.propTypes = {
  connecting: PropTypes.bool,
  isConnected: PropTypes.bool,
  onReverify: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
}

// The currently active connection: identity, live probe, capabilities, and the
// re-verify / disconnect / edit actions. Deep add/edit routes to the Connect page.
/**
 *
 */
const ActiveConnectionCard = ({
  conn,
  status = null,
  error = null,
  capabilities = null,
  probe = null,
  isConnected = false,
  onReverify,
  onDisconnect,
  onEdit,
}) => (
  <div className={styles.activeConn}>
    <div className={styles.acTop}>
      <span className={`${styles.dot} ${isConnected ? styles.live : ""}`} />
      <span className={styles.acName}>
        {conn.name || hostLabel(conn.backendUrl)}
      </span>
      <span className={styles.badge}>{conn.authMode || "none"}</span>
    </div>
    <div className={styles.acUrl}>{conn.backendUrl}</div>

    <ProbeMeta probe={probe} isConnected={isConnected} />
    <CapabilityChips capabilities={capabilities} />
    <ConnectionError status={status} error={error} />

    <ActiveConnectionActions
      connecting={status === "connecting"}
      isConnected={isConnected}
      onReverify={onReverify}
      onDisconnect={onDisconnect}
      onEdit={onEdit}
    />
  </div>
)

ActiveConnectionCard.propTypes = {
  conn: connShape.isRequired,
  status: PropTypes.string,
  error: PropTypes.string,
  capabilities: capabilitiesShape,
  probe: probeShape,
  isConnected: PropTypes.bool,
  onReverify: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
}

/**
 *
 */
const SavedRow = ({
  conn,
  active = false,
  connected = false,
  busy = false,
  onPick,
  onDelete,
}) => (
  <div className={`${styles.savedRow} ${active ? styles.rowActive : ""}`}>
    <button
      className={styles.savedPick}
      onClick={onPick}
      disabled={busy}
      type="button"
    >
      <span
        className={`${styles.dot} ${active && connected ? styles.live : ""}`}
      />
      <span className={styles.srBody}>
        <span className={styles.srName}>{conn.name}</span>
        <span className={styles.srUrl}>{conn.backendUrl}</span>
      </span>
      <span className={styles.badge}>{conn.authMode || "none"}</span>
      {active && <Check size={13} className={styles.srCheck} />}
    </button>
    <button
      className={styles.rowDel}
      onClick={onDelete}
      title="Delete connection"
      type="button"
    >
      <Trash2 size={13} />
    </button>
  </div>
)

SavedRow.propTypes = {
  conn: connShape.isRequired,
  active: PropTypes.bool,
  connected: PropTypes.bool,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

// Reads entirely from the connection context — no form duplication.
/**
 *
 */
const ConnectionSection = () => {
  const navigate = useNavigate()
  const {
    status,
    error,
    active,
    capabilities,
    probe,
    saved,
    connect,
    disconnect,
    removeSaved,
    isConnected,
  } = useConnection()
  const [busyId, setBusyId] = useState(null)

  const activeUrl = active?.backendUrl
  const toEdit = () => navigate("/")

  const reverify = async () => {
    if (!active) return
    setBusyId("active")
    await connect(active, { remember: false })
    setBusyId(null)
  }

  const switchTo = async (profile) => {
    setBusyId(profile.id)
    await connect(profile)
    setBusyId(null)
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardH}>
        <h2>Connection</h2>
      </div>

      {active ? (
        <ActiveConnectionCard
          conn={active}
          status={status}
          error={error}
          capabilities={capabilities}
          probe={probe}
          isConnected={isConnected}
          onReverify={reverify}
          onDisconnect={disconnect}
          onEdit={toEdit}
        />
      ) : (
        <div className={styles.noneConn}>
          <span>No active connection.</span>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={toEdit}
            type="button"
          >
            Connect a backend
          </button>
        </div>
      )}

      <div className={styles.subH}>Saved connections</div>
      <div className={styles.savedList}>
        {saved.length === 0 && (
          <div className={styles.empty}>No saved connections.</div>
        )}
        {saved.map((p) => (
          <SavedRow
            key={p.id}
            conn={p}
            active={p.backendUrl === activeUrl}
            connected={isConnected}
            busy={busyId === p.id}
            onPick={() => switchTo(p)}
            onDelete={() => removeSaved(p.id)}
          />
        ))}
      </div>
    </section>
  )
}

export default ConnectionSection
