import { Database, GitBranch, Info, Link2, Shield } from "lucide-react"
import { useState } from "react"
import { useSelector } from "react-redux"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import styles from "../graph.module.css"

function cx(...c) {
  return c.filter(Boolean).join(" ")
}

// Nodes / edges headline stats.
function Stats({ nodeCount, edgeCount }) {
  const items = [
    {
      icon: GitBranch,
      label: "Nodes",
      value: nodeCount,
      tone: styles.statBlue,
    },
    { icon: Link2, label: "Edges", value: edgeCount, tone: styles.statGreen },
  ]
  return (
    <div className={styles.statGrid}>
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className={styles.statCell}>
          <div className={cx(styles.statTop, tone)}>
            <Icon size={15} strokeWidth={1.8} />
            <span className={styles.statNum}>{value}</span>
          </div>
          <div className={styles.statLabel}>{label}</div>
        </div>
      ))}
    </div>
  )
}

// Checkpointer / publisher / store feature flags with a ✓/✗ marker.
function Features({ checkpointer, checkpointerType, publisher, store }) {
  const rows = [
    {
      icon: Database,
      label: "Checkpointer",
      on: checkpointer,
      type: checkpointer ? checkpointerType : null,
    },
    { icon: Shield, label: "Publisher", on: publisher },
    { icon: Info, label: "Store", on: store },
  ]
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>Features</h4>
      {rows.map(({ icon: Icon, label, on, type }) => (
        <div key={label} className={styles.featureRow}>
          <div className={styles.featureLeft}>
            <Icon
              size={15}
              strokeWidth={1.8}
              className={on ? styles.okText : styles.mutedText}
            />
            <span className={styles.featureLabel}>
              {label}
              {type && <span className={styles.featureType}> ({type})</span>}
            </span>
          </div>
          <span className={on ? styles.okText : styles.mutedText}>
            {on ? "✓" : "✗"}
          </span>
        </div>
      ))}
    </div>
  )
}

function Interrupts({ before, after }) {
  if (!before.length && !after.length) return null
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>Interrupts</h4>
      {before.length > 0 && (
        <div className={styles.kvLine}>
          <span className={styles.kvKey}>Before:</span> {before.join(", ")}
        </div>
      )}
      {after.length > 0 && (
        <div className={styles.kvLine}>
          <span className={styles.kvKey}>After:</span> {after.join(", ")}
        </div>
      )}
    </div>
  )
}

function StateIdentity({
  contextType,
  idGenerator,
  idType,
  stateType,
  stateFields,
}) {
  const has =
    [contextType, idGenerator, idType, stateType].some(
      (v) => v && v !== "none"
    ) || stateFields.length > 0
  if (!has) return null
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>State &amp; Identity</h4>
      {contextType && contextType !== "none" && (
        <div className={styles.kvLine}>
          <span className={styles.kvKey}>Context Type:</span> {contextType}
        </div>
      )}
      {stateType && (
        <div className={styles.kvLine}>
          <span className={styles.kvKey}>State Type:</span> {stateType}
        </div>
      )}
      {stateFields.length > 0 && (
        <>
          <div className={styles.kvLine}>
            <span className={styles.kvKey}>State Fields:</span>
          </div>
          <div className={styles.chips}>
            {stateFields.map((f) => (
              <span key={f} className={styles.chip}>
                {f}
              </span>
            ))}
          </div>
        </>
      )}
      {idGenerator && (
        <div className={styles.kvLine}>
          <span className={styles.kvKey}>ID Generator:</span> {idGenerator}
          {idType ? ` · Type-${idType}` : ""}
        </div>
      )}
    </div>
  )
}

/**
 * Graph Info card (ported from the legacy view): headline stats, feature flags,
 * interrupts, state & identity — all from the live GET /v1/graph · info payload.
 * The full StateSchema JSON (GET /v1/graph:StateSchema) is collapsible below.
 */
export default function GraphInfoPane() {
  const info = useSelector((s) => s.graph.info)
  const stateSchema = useSelector((s) => s.graph.stateSchema)
  const [showSchema, setShowSchema] = useState(false)

  if (!info) {
    return (
      <Card className={styles.card}>
        <CardContent className={styles.cardBody}>
          <div className={styles.emptyTile}>
            No graph info — connect to a backend.
          </div>
        </CardContent>
      </Card>
    )
  }

  const g = {
    node_count: info.node_count || 0,
    edge_count: info.edge_count || 0,
    checkpointer: !!info.checkpointer,
    checkpointer_type: info.checkpointer_type || "None",
    publisher: !!info.publisher,
    store: !!info.store,
    interrupt_before: info.interrupt_before || [],
    interrupt_after: info.interrupt_after || [],
    context_type: info.context_type || "none",
    id_generator: info.id_generator || "",
    id_type: info.id_type || "",
    state_type: info.state_type || "",
    state_fields: info.state_fields || [],
  }

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.cardHead}>
        <CardTitle className={cx(styles.cardTitle, styles.titleRow)}>
          <Info size={17} strokeWidth={1.8} />
          Graph Info
        </CardTitle>
      </CardHeader>

      <CardContent className={styles.cardBody}>
        <Stats nodeCount={g.node_count} edgeCount={g.edge_count} />
        <Features
          checkpointer={g.checkpointer}
          checkpointerType={g.checkpointer_type}
          publisher={g.publisher}
          store={g.store}
        />
        <Interrupts before={g.interrupt_before} after={g.interrupt_after} />
        <StateIdentity
          contextType={g.context_type}
          idGenerator={g.id_generator}
          idType={g.id_type}
          stateType={g.state_type}
          stateFields={g.state_fields}
        />

        {stateSchema && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.schemaToggle}
              onClick={() => setShowSchema((v) => !v)}
            >
              {showSchema ? "Hide" : "Show"} state schema
            </button>
            {showSchema && (
              <pre className={styles.schema}>
                {JSON.stringify(stateSchema, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
