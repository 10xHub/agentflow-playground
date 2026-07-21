import PropTypes from "prop-types"

import styles from "../observability.module.css"

const nf = new Intl.NumberFormat("en-US")

// Build attr rows for the current selection (a span or an event).
/**
 *
 */
const attributesFor = (sel) => {
  if (!sel) return []
  if (sel.selType === "event") {
    return [
      { k: "event", v: sel.type },
      { k: "node", v: sel.node },
      { k: "offset", v: sel.time },
    ]
  }
  // span
  if (sel.model !== undefined && sel.kind === "llm") {
    return [
      { k: "gen_ai.request.model", v: sel.model || "—" },
      { k: "gen_ai.usage.input_tokens", v: nf.format(sel.in || 0) },
      { k: "gen_ai.usage.output_tokens", v: nf.format(sel.out || 0) },
      { k: "duration", v: sel.dur },
    ]
  }
  return [
    { k: "span.kind", v: sel.kind },
    { k: "duration", v: sel.dur },
    { k: "status", v: "OK", ok: true },
  ]
}

// Header strings differ for events vs spans; kept out of the component so the
// render stays a straight read of the derived values.
/**
 *
 */
const headerFor = (sel) => {
  if (sel?.selType === "event") {
    return {
      title: "Event detail",
      kind: sel.type,
      name: `${sel.type} · ${sel.node}`,
      sub: `offset ${sel.time}`,
    }
  }
  return {
    title: "Span detail",
    kind: sel?.kind ?? "—",
    name: (sel?.name ?? "").replace(/^\w+: /, ""),
    sub: `${sel?.dur ?? ""} · status OK`,
  }
}

/**
 *
 */
const SpanContext = ({ sel = null }) => (
  <>
    <div className={styles.attrH}>Context</div>
    <div className={styles.attr}>
      <span className={styles.ak}>span.id</span>
      <span className={styles.av}>{sel?.spanId ?? "—"}</span>
    </div>
    <div className={styles.attr}>
      <span className={styles.ak}>parent</span>
      <span className={styles.av}>{sel?.parent ?? "—"}</span>
    </div>
    <div className={styles.attr}>
      <span className={styles.ak}>kind</span>
      <span className={styles.av}>{sel?.kind ?? "—"}</span>
    </div>
  </>
)

SpanContext.propTypes = {
  sel: PropTypes.shape({
    spanId: PropTypes.string,
    parent: PropTypes.string,
    kind: PropTypes.string,
  }),
}

/**
 *
 */
const DetailPanel = ({ sel = null }) => {
  const isEvent = sel?.selType === "event"
  const { title, kind, name, sub } = headerFor(sel)

  const attributes = attributesFor(sel)

  return (
    <aside className={styles.detail}>
      <div className={styles.detHead}>
        <span className={styles.detTitle}>{title}</span>
        <span className={styles.detKind}>{kind}</span>
      </div>
      <div className={styles.detBody}>
        <div className={styles.detName}>{name}</div>
        <div className={styles.detSub}>{sub}</div>

        <div className={styles.attrH}>
          {isEvent ? "Attributes" : "GenAI semconv"}
        </div>
        <div>
          {attributes.map((a) => (
            <div className={styles.attr} key={a.k}>
              <span className={styles.ak}>{a.k}</span>
              <span className={`${styles.av} ${a.ok ? styles.ok : ""}`}>
                {a.v}
              </span>
            </div>
          ))}
        </div>

        {isEvent ? (
          <>
            <div className={styles.attrH}>Payload</div>
            <div className={styles.jsonBox}>{sel.summary}</div>
          </>
        ) : (
          <SpanContext sel={sel} />
        )}
      </div>
    </aside>
  )
}

DetailPanel.propTypes = {
  sel: PropTypes.shape({
    selType: PropTypes.string,
    type: PropTypes.string,
    node: PropTypes.string,
    time: PropTypes.string,
    name: PropTypes.string,
    kind: PropTypes.string,
    dur: PropTypes.string,
    summary: PropTypes.node,
    spanId: PropTypes.string,
    parent: PropTypes.string,
  }),
}

export default DetailPanel
