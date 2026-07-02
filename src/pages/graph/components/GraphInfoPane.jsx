import { useSelector } from "react-redux"

import styles from "../graph.module.css"

function cx(...c) {
  return c.filter(Boolean).join(" ")
}

// Format a raw info value into { text, tone } for display.
const fmt = (key, value) => {
  if (Array.isArray(value)) {
    return value.length
      ? { text: value.join(", ") }
      : { text: "none", tone: "muted" }
  }
  if (typeof value === "boolean") {
    return value
      ? { text: "true", tone: "ok" }
      : { text: "false", tone: "muted" }
  }
  if (value === null || value === undefined) return { text: "—", tone: "muted" }
  return { text: String(value) }
}

// Info keys worth surfacing, in order. `state_fields` is rendered separately.
const INFO_KEYS = [
  "node_count",
  "edge_count",
  "checkpointer",
  "checkpointer_type",
  "publisher",
  "store",
  "interrupt_before",
  "interrupt_after",
  "context_type",
  "id_generator",
  "id_type",
  "state_type",
]

export default function GraphInfoPane() {
  const info = useSelector((s) => s.graph.info)
  const stateSchema = useSelector((s) => s.graph.stateSchema)

  if (!info)
    return (
      <div className={styles.nDesc}>No graph info — connect to a backend.</div>
    )

  const stateFields = info.state_fields || []
  const schemaText = stateSchema
    ? JSON.stringify(stateSchema, null, 2)
    : "State schema unavailable."

  return (
    <div>
      <div className={styles.secH}>GET /v1/graph · info</div>
      {INFO_KEYS.filter((k) => k in info).map((k) => {
        const { text, tone } = fmt(k, info[k])
        return (
          <div className={styles.kv} key={k}>
            <span className={styles.k}>{k}</span>
            <span className={cx(styles.v, tone && styles[tone])}>{text}</span>
          </div>
        )
      })}

      {stateFields.length > 0 && (
        <>
          <div className={styles.pH2}>state_fields</div>
          <div className={styles.chips}>
            {stateFields.map((f) => (
              <span className={styles.chip} key={f}>
                {f}
              </span>
            ))}
          </div>
        </>
      )}

      <div className={styles.pH2}>GET /v1/graph:StateSchema</div>
      <pre className={styles.schema}>{schemaText}</pre>
    </div>
  )
}
