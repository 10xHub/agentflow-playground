import { ExternalLink } from "lucide-react"

import { GRAPH_INFO, STATE_FIELDS } from "../data"
import styles from "../graph.module.css"

function cx(...c) {
  return c.filter(Boolean).join(" ")
}

// Real info fields (GET /v1/graph · info), state_fields chips and a StateSchema
// JSON snippet.
export default function GraphInfoPane() {
  return (
    <div>
      <div className={styles.secH}>GET /v1/graph · info</div>
      {GRAPH_INFO.map((row) => (
        <div className={styles.kv} key={row.k}>
          <span className={styles.k}>{row.k}</span>
          <span className={cx(styles.v, row.tone && styles[row.tone])}>
            {row.v}
          </span>
        </div>
      ))}

      <div className={styles.pH2}>state_fields</div>
      <div className={styles.chips}>
        {STATE_FIELDS.map((f) => (
          <span className={styles.chip} key={f}>
            {f}
          </span>
        ))}
      </div>

      <div className={styles.pH2}>GET /v1/graph:StateSchema</div>
      <div className={styles.schema}>
        {"{\n  "}
        <span className={styles.key}>"title"</span>
        {": "}
        <span className={styles.str}>"AgentState"</span>
        {",\n  "}
        <span className={styles.key}>"type"</span>
        {": "}
        <span className={styles.str}>"object"</span>
        {",\n  "}
        <span className={styles.key}>"properties"</span>
        {": {\n    "}
        <span className={styles.key}>"context"</span>
        {": { "}
        <span className={styles.key}>"type"</span>
        {": "}
        <span className={styles.str}>"array"</span>
        {" },\n    "}
        <span className={styles.key}>"context_summary"</span>
        {": { "}
        <span className={styles.key}>"type"</span>
        {": "}
        <span className={styles.str}>"string"</span>
        {" },\n    "}
        <span className={styles.key}>"execution_meta"</span>
        {": { "}
        <span className={styles.key}>"$ref"</span>
        {": "}
        <span className={styles.str}>"#/$defs/ExecMeta"</span>
        {" }\n  }\n}"}
      </div>

      <button className={styles.pOpen} type="button">
        <ExternalLink size={13} strokeWidth={1.7} />
        Open full state schema
      </button>
    </div>
  )
}
