import { NODE_BOXES } from "../data"
import styles from "../graph.module.css"

// Inline SVG edges kept verbatim from the mockup (solid .edge + dashed .cond
// conditional edges with labels + arrow marker) — not replaced with lucide.
function Edges() {
  return (
    <svg className={styles.edges} viewBox="0 0 640 380">
      <defs>
        <marker
          id="graph-arrow"
          markerWidth="9"
          markerHeight="9"
          refX="6.5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6" />
        </marker>
      </defs>
      {/* START -> agent */}
      <path
        className={styles.edge}
        d="M124 90 L196 168"
        markerEnd="url(#graph-arrow)"
      />
      {/* agent -> tools (conditional, up arc) */}
      <path
        className={styles.cond}
        d="M312 178 Q360 148 408 178"
        markerEnd="url(#graph-arrow)"
      />
      <text className={styles.elabel} x="360" y="142" textAnchor="middle">
        tool_calls
      </text>
      {/* tools -> agent (down arc) */}
      <path
        className={styles.edge}
        d="M408 202 Q360 232 312 202"
        markerEnd="url(#graph-arrow)"
      />
      <text className={styles.elabel} x="360" y="248" textAnchor="middle">
        tool_result
      </text>
      {/* agent -> END (conditional) */}
      <path
        className={styles.cond}
        d="M250 218 L250 300"
        markerEnd="url(#graph-arrow)"
      />
      <text className={styles.elabel} x="262" y="264" textAnchor="start">
        final
      </text>
    </svg>
  )
}

function cx(...c) {
  return c.filter(Boolean).join(" ")
}

export default function GraphCanvas({ selected, onSelect, live }) {
  return (
    <div className={styles.canvasWrap}>
      <div className={styles.canvas}>
        <Edges />

        {NODE_BOXES.map((n) => {
          const isSentinel = n.kind === "sentinel"
          const isCurrent = n.name === "agent" && live
          return (
            <div
              key={n.name}
              className={cx(
                styles.gnode,
                isSentinel && styles.sentinel,
                isCurrent && styles.current,
                selected === n.name && styles.sel
              )}
              style={{ left: `${n.left}px`, top: `${n.top}px` }}
              onClick={() => onSelect(n.name)}
            >
              {n.runtag && <span className={styles.runtag}>{n.runtag}</span>}
              <div className={styles.gnName}>{n.name}</div>
              {n.sub && (
                <div className={styles.gnSub}>
                  <span className={cx(styles.kdot, styles[n.kind])} />
                  {n.sub}
                </div>
              )}
              {n.badge && <span className={styles.gnBadge}>{n.badge}</span>}
            </div>
          )
        })}

        <div className={styles.legend}>
          <span>
            <span className={styles.ln} />
            edge
          </span>
          <span>
            <span className={cx(styles.ln, styles.cond)} />
            conditional
          </span>
          <span>
            <span
              className={cx(styles.kdot, styles.agent)}
              style={{ width: 8, height: 8 }}
            />
            agent
          </span>
          <span>
            <span
              className={cx(styles.kdot, styles.tool)}
              style={{ width: 8, height: 8 }}
            />
            tool node
          </span>
        </div>
      </div>
    </div>
  )
}
