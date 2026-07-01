import { Info } from "lucide-react"

import JsonSchema from "./JsonSchema"
import ParamTable from "./ParamTable"
import styles from "../tools.module.css"

// Read-only view for server / MCP tools — schema comes from all_tools() and
// cannot be edited from the playground.
export default function ReadonlyDetail({ tool }) {
  const isMcp = tool.kind === "mcp"

  const kindBadge = isMcp ? (
    <span className={`${styles.nb} ${styles.mcp}`}>
      <span className={styles.tdot} style={{ background: "var(--violet)" }} />
      mcp
    </span>
  ) : (
    <span className={styles.nb}>
      <span className={styles.tdot} style={{ background: "var(--blue)" }} />
      server{tool.src === "remote" ? " · remote" : " · local"}
    </span>
  )

  const ctx = isMcp ? (
    <>
      <span className={styles.nb}>server {tool.server}</span>
      <span className={styles.nb}>transport {tool.transport}</span>
    </>
  ) : (
    <span className={styles.nb}>node {tool.node}</span>
  )

  return (
    <>
      <div className={styles.dTop}>
        <div>
          <div className={styles.dName}>{tool.name}</div>
          <div className={styles.dBadges}>
            {kindBadge}
            {ctx}
          </div>
        </div>
      </div>
      <div className={styles.dDesc}>{tool.desc}</div>

      <div className={styles.secH}>Parameters</div>
      <ParamTable params={tool.params} />

      <div className={styles.secH}>JSON schema</div>
      <JsonSchema tool={tool} />

      <div className={styles.note}>
        <Info size={15} strokeWidth={1.7} />
        <span>
          <b>Read-only.</b> {isMcp ? "MCP tool schemas" : "Server tool schemas"} come from{" "}
          <span className="mono">all_tools()</span> on the node. Listing them in the UI needs a
          small backend endpoint that exposes this (not served today); client tools below run
          fully in the browser.
        </span>
      </div>
    </>
  )
}
