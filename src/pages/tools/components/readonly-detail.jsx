import { Info } from "lucide-react"
import PropTypes from "prop-types"

import styles from "../tools.module.css"

import JsonSchema from "./json-schema"
import ParamTable from "./param-table"

// Read-only view for server / MCP tools — schema comes from all_tools() and
// cannot be edited from the playground.
/**
 *
 */
const ReadonlyDetail = ({ tool }) => {
  const isMcp = tool.kind === "mcp"

  const kindBadge = isMcp ? (
    <span className={`${styles.nb} ${styles.mcp}`}>
      <span className={styles.tdot} style={{ background: "var(--violet)" }} />
      mcp
    </span>
  ) : (
    <span className={styles.nb}>
      <span className={styles.tdot} style={{ background: "var(--blue)" }} />
      server · {tool.src || "local"}
    </span>
  )

  const context = isMcp ? (
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
            {context}
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
          <b>Read-only.</b> {isMcp ? "MCP tool schemas" : "Server tool schemas"}{" "}
          come live from <span className="mono">GET /v1/graph/tools</span> (
          <span className="mono">all_tools()</span> on node{" "}
          <span className="mono">{tool.node}</span>) and can&apos;t be edited
          from the playground. Client tools run fully in the browser.
        </span>
      </div>
    </>
  )
}

ReadonlyDetail.propTypes = {
  tool: PropTypes.shape({
    kind: PropTypes.string,
    src: PropTypes.string,
    server: PropTypes.string,
    transport: PropTypes.string,
    node: PropTypes.string,
    name: PropTypes.string,
    desc: PropTypes.string,
    params: PropTypes.array,
  }).isRequired,
}

export default ReadonlyDetail
