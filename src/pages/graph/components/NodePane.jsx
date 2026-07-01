import { NODES } from "../data"
import styles from "../graph.module.css"

function cx(...c) {
  return c.filter(Boolean).join(" ")
}

// Renders the selected node: name/id/kind/desc, Connections (in/out edges),
// Tools & skills cards (source tags local·remote·mcp + connected dots) and the
// MCP section. Tools are merged from the registry by node_name.
export default function NodePane({ name }) {
  const n = NODES[name]
  if (!n) return null

  const kindLabel = n.kind === "sentinel" ? "sentinel" : `${n.kind} node`

  return (
    <div>
      <div className={styles.nName}>{name}</div>

      <div className={styles.nBadges}>
        <span className={styles.nb}>
          {kindLabel}
          {n.kind !== "sentinel" && (
            <span className={cx(styles.kdot, styles[n.kind])} />
          )}
        </span>
        <span className={styles.nb}>id {n.id}</span>
        {n.interrupt && <span className={styles.nb}>interrupt</span>}
      </div>

      <div className={styles.nDesc}>{n.desc}</div>

      <div className={styles.secH}>Connections</div>
      {n.inn.length === 0 && n.out.length === 0 && (
        <div className={styles.nDesc} style={{ margin: 0 }}>
          No edges.
        </div>
      )}
      {n.inn.map((s) => (
        <div key={`in-${s}`} className={cx(styles.edgeRow, styles.in)}>
          <span className={styles.arw}>←</span>
          <span className={styles.nn}>{s}</span>
          <span className={styles.cnd}>in</span>
        </div>
      ))}
      {n.out.map((o) => (
        <div key={`out-${o.to}`} className={styles.edgeRow}>
          <span className={styles.arw}>→</span>
          <span className={styles.nn}>{o.to}</span>
          <span className={styles.cnd}>{o.cond || "out"}</span>
        </div>
      ))}

      {n.tools && (
        <>
          <div className={cx(styles.secH, styles.secHTop)}>
            Tools &amp; skills · {n.tools.length} connected
          </div>
          {n.tools.map((t) => (
            <div key={t.name} className={styles.toolCard}>
              <div className={styles.tcTop}>
                <span className={styles.tcName}>{t.name}</span>
                <span className={cx(styles.tcSrc, styles[t.src])}>{t.src}</span>
                <span className={styles.tcConn}>
                  <span className={styles.d} />
                  connected
                </span>
              </div>
              <div className={styles.tcDesc}>{t.desc}</div>
              <div className={styles.tcParams}>
                <b>params</b> {t.params}
              </div>
            </div>
          ))}
          {n.mcp.map((m) => (
            <div key={m.server}>
              <div className={styles.mcpHead}>
                <span className={styles.d} />
                MCP · {m.server}
              </div>
              {m.tools.map((mt) => (
                <div key={mt} className={styles.toolCard}>
                  <div className={styles.tcTop}>
                    <span className={styles.tcName}>{mt}</span>
                    <span className={cx(styles.tcSrc, styles.mcp)}>mcp</span>
                    <span className={styles.tcConn}>
                      <span className={styles.d} />
                      connected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {n.kind === "agent" && (
        <>
          <div className={cx(styles.secH, styles.secHTop)}>Routes to</div>
          <div className={styles.toolCard}>
            <div className={styles.tcDesc}>
              Conditional edge selects{" "}
              <span className={`mono ${styles.routeTextHl}`}>tools</span> when
              the model returns tool_calls, otherwise{" "}
              <span className={`mono ${styles.routeTextHl}`}>END</span>. Live
              routing is highlighted on the canvas during a run.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
