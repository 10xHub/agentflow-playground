import { ExternalLink } from "lucide-react"

import styles from "../observability.module.css"

const nf = new Intl.NumberFormat("en-US")

// Build attr rows for the current selection (a span or an event).
function attrsFor(sel) {
  if (!sel) return []
  if (sel.selType === "event") {
    return [
      { k: "event", v: sel.type },
      { k: "node", v: sel.node },
      { k: "offset", v: sel.time },
    ]
  }
  // span
  if (sel.model) {
    return [
      { k: "gen_ai.system", v: "google.genai" },
      { k: "gen_ai.request.model", v: sel.model },
      { k: "gen_ai.usage.input_tokens", v: nf.format(sel.in) },
      { k: "gen_ai.usage.output_tokens", v: nf.format(sel.out) },
      { k: "gen_ai.response.finish", v: "stop", ok: true },
      { k: "duration", v: sel.dur },
    ]
  }
  return [
    { k: "span.kind", v: sel.kind },
    { k: "duration", v: sel.dur },
    { k: "status", v: "OK", ok: true },
  ]
}

export default function DetailPanel({ sel }) {
  const isEvent = sel?.selType === "event"

  const title = isEvent ? "Event detail" : "Span detail"
  const kind = isEvent ? sel.type : sel?.kind ?? "—"
  const name = isEvent
    ? `${sel.type} · ${sel.node}`
    : (sel?.name ?? "").replace(/^\w+: /, "")
  const sub = isEvent ? `offset ${sel.time}` : `${sel?.dur ?? ""} · status OK`

  const attrs = attrsFor(sel)

  return (
    <aside className={styles.detail}>
      <div className={styles.detHead}>
        <span className={styles.detTitle}>{title}</span>
        <span className={styles.detKind}>{kind}</span>
      </div>
      <div className={styles.detBody}>
        <div className={styles.detName}>{name}</div>
        <div className={styles.detSub}>{sub}</div>

        <div className={styles.attrH}>{isEvent ? "Attributes" : "GenAI semconv"}</div>
        <div>
          {attrs.map((a) => (
            <div className={styles.attr} key={a.k}>
              <span className={styles.ak}>{a.k}</span>
              <span className={`${styles.av} ${a.ok ? styles.ok : ""}`}>{a.v}</span>
            </div>
          ))}
        </div>

        {isEvent ? (
          <>
            <div className={styles.attrH}>Payload</div>
            <div className={styles.jsonBox}>{sel.summary}</div>
          </>
        ) : (
          <>
            <div className={styles.attrH}>Context</div>
            <div className={styles.attr}>
              <span className={styles.ak}>session.id</span>
              <span className={styles.av}>th_9f2a…c17</span>
            </div>
            <div className={styles.attr}>
              <span className={styles.ak}>span.id</span>
              <span className={styles.av}>{sel?.spanId ?? "—"}</span>
            </div>
            <div className={styles.attr}>
              <span className={styles.ak}>parent</span>
              <span className={styles.av}>{sel?.parent ?? "—"}</span>
            </div>

            <button className={styles.detOpen} type="button">
              <ExternalLink size={13} />
              Open this span in Logfire
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
