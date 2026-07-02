import { Copy, RefreshCw, Save, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadGraphInfo } from "@/store/chatThunks"
import {
  FIXED_FIELDS,
  fetchThreadState,
  saveThreadState,
  setField,
} from "@/store/stateSlice"

import styles from "../chat.module.css"

const TABS = ["events", "state", "graph", "frames", "curl"]
const TAB_LABEL = {
  events: "Events",
  state: "State",
  graph: "Graph",
  frames: "Frames",
  curl: "cURL",
}

const empty = (text) => <div className={styles.inspEmpty}>{text}</div>

function EventsPane() {
  const events = useSelector((s) => s.chat.events)
  if (!events.length)
    return empty("No events yet — send a message to see the live stream.")
  return (
    <>
      {events.map((e, i) => (
        <div className={styles.ev} key={i}>
          <div className={styles.evH}>
            <span className={`${styles.evType} ${styles[e.type] || ""}`}>
              {e.type}
            </span>
            <span className={styles.evNode}>{e.node}</span>
            <span className={styles.evTime}>{e.time}</span>
          </div>
          <div className={styles.evDetail}>{e.detail}</div>
        </div>
      ))}
    </>
  )
}

function GraphPane() {
  const dispatch = useDispatch()
  const graphInfo = useSelector((s) => s.chat.graphInfo)

  // Fetch the real structure the first time this tab is opened.
  useEffect(() => {
    if (!graphInfo) dispatch(loadGraphInfo())
  }, [graphInfo, dispatch])

  if (!graphInfo) return empty("Loading graph structure…")

  const nodes = graphInfo.nodes || graphInfo.node_list || []
  const edges = graphInfo.edges || graphInfo.edge_list || []

  return (
    <>
      <div className={styles.trajHead}>
        <span>Graph structure</span>
        <span className={styles.tjThread}>
          {(graphInfo.node_count ?? nodes.length) || 0} nodes ·{" "}
          {(graphInfo.edge_count ?? edges.length) || 0} edges
        </span>
      </div>
      {nodes.length ? (
        <div className={styles.traj}>
          {nodes.map((n, i) => {
            const name =
              typeof n === "string" ? n : n?.name || n?.id || `node ${i}`
            const meta = typeof n === "string" ? "" : n?.type || n?.kind || ""
            return (
              <div key={i} className={styles.tstep}>
                <span className={styles.tdot} />
                <div className={styles.tinfo}>
                  <span className={styles.tname}>{name}</span>
                  <span className={styles.tmeta}>{meta}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <pre className={styles.curlbox}>
          {JSON.stringify(graphInfo, null, 2)}
        </pre>
      )}
    </>
  )
}

function FramesPane() {
  const frames = useSelector((s) => s.chat.frames)
  if (!frames.length)
    return empty("No frames yet — the send/receive log appears here.")
  return (
    <>
      {frames.map((f, i) => (
        <div className={styles.frame} key={i}>
          <div className={styles.fh}>
            <span className={`${styles.fdir} ${styles[f.dir]}`}>
              {f.dir === "out" ? "▲ send" : "▼ recv"}
            </span>
            {f.label}
            <span className={styles.ft}>{f.time}</span>
          </div>
        </div>
      ))}
    </>
  )
}

// Build a real, copy-pasteable cURL from the last request snapshot.
const toCurl = (req) => {
  if (!req) return null
  const lines = [
    `curl ${req.mode === "invoke" ? "" : "-N "}-X ${req.method} '${req.url}' \\`,
  ]
  Object.entries(req.headers || {}).forEach(([k, v]) => {
    lines.push(`  -H '${k}: ${v}' \\`)
  })
  lines.push(`  -d '${JSON.stringify(req.body)}'`)
  return lines.join("\n")
}

function CurlPane() {
  const req = useSelector((s) => s.chat.lastRequest)
  const [copied, setCopied] = useState(false)
  const curl = toCurl(req)

  if (!curl)
    return empty("No request yet — send a message to generate a cURL command.")

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className={styles.curlWrap}>
      <button className={styles.curlCopy} type="button" onClick={copy}>
        <Copy size={13} /> {copied ? "Copied" : "Copy"}
      </button>
      <pre className={styles.curlbox}>{curl}</pre>
    </div>
  )
}

// ---- State pane -----------------------------------------------------------
// Bidirectional view of the CURRENT THREAD's AgentState, backed by the
// thread-keyed `threadState` slice (state persists per thread in Redux). Three
// fields are fixed (context / context_summary / execution_meta); every other
// key is a graph-defined field surfaced from the schema, so the list is dynamic.
// Sync = GET /v1/threads/{id}/state · Save = PUT (changed keys only).

// A metadata row: renders "—" for empty values; objects pretty-print as JSON.
const metaVal = (v) => {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

// Compact a possibly-structured value (tool output, args) to a single string.
const asText = (v) => {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// Render one content block to a readable line. Assistant/tool turns often carry
// NO text block — just tool_call / tool_result / reasoning — so a text-only
// extractor shows them as empty. This handles every block type the core emits.
const blockToText = (b) => {
  if (typeof b === "string") return b
  switch (b?.type) {
    case "text":
      return b.text || ""
    case "tool_call":
    case "remote_tool_call":
      return `🛠 ${b.name}(${asText(b.args ?? {})})`
    case "tool_result": {
      const tag =
        b.is_error || b.status === "failed" ? "⚠ tool error" : "↳ result"
      return `${tag}: ${asText(b.output ?? b.content)}`
    }
    case "reasoning":
      return `💭 ${b.summary || (b.details || []).join(" ") || "reasoning"}`
    case "error":
      return `⚠ ${b.message || "error"}`
    case "image":
    case "audio":
    case "video":
    case "document":
      return `[${b.type}]`
    case "data":
      return `[data ${b.mime_type || ""}]`
    default:
      return b?.type ? `[${b.type}]` : asText(b)
  }
}

// Message content is a plain string or a list of typed blocks. Join every block
// to a readable multi-line summary so assistant tool calls and tool results are
// visible instead of blank. Also fold in top-level tool call fields some
// providers put on the message (tools_calls / reasoning) when content is bare.
const messageText = (msg) => {
  const content = msg?.content ?? msg
  const lines = []
  if (typeof content === "string") {
    if (content) lines.push(content)
  } else if (Array.isArray(content)) {
    content.forEach((b) => {
      const t = blockToText(b)
      if (t) lines.push(t)
    })
  }
  // Some assistant turns carry tool calls on a sibling field, not in content.
  if (Array.isArray(msg?.tools_calls)) {
    msg.tools_calls.forEach((tc) => {
      const fn = tc?.function || tc
      lines.push(
        `🛠 ${fn?.name || tc?.name || "tool"}(${asText(fn?.arguments ?? tc?.args ?? {})})`
      )
    })
  }
  return lines.join("\n")
}

// Serialize a value for a text input; objects/arrays render as pretty JSON.
const toEditable = (v) =>
  typeof v === "string" ? v : JSON.stringify(v, null, 2)

// A dynamic field: JSON is parsed back to a value; anything else stays a string.
// The parent remounts this (via a key that includes the sync nonce) whenever a
// fresh load replaces the state, so `raw` re-seeds from `value` without an effect.
function DynamicField({ fieldKey, info, value, onChange }) {
  const [raw, setRaw] = useState(() => toEditable(value))
  const [invalid, setInvalid] = useState(false)

  const structured = typeof value !== "string"

  const handle = (next) => {
    setRaw(next)
    if (!structured) {
      onChange(next)
      return
    }
    try {
      onChange(JSON.parse(next))
      setInvalid(false)
    } catch {
      setInvalid(true) // keep the text; flag until it parses
    }
  }

  return (
    <div className={styles.stCard}>
      <div className={styles.stFieldHead}>
        <span className={styles.stFieldKey}>{info?.title || fieldKey}</span>
        <span className={styles.stFieldType}>
          {(Array.isArray(info?.type) ? info.type[0] : info?.type) ||
            (structured ? "json" : "string")}
        </span>
        {info?.description && (
          <span className={styles.stFieldDesc}>{info.description}</span>
        )}
      </div>
      <textarea
        className={`${styles.stArea} ${invalid ? styles.stInvalid : ""}`}
        value={raw}
        rows={structured ? 4 : 2}
        onChange={(e) => handle(e.target.value)}
        spellCheck={false}
      />
      {invalid && (
        <div className={styles.stHint}>Invalid JSON — fix to apply</div>
      )}
    </div>
  )
}

// Diagnostic view of execution_meta — the "what is the run doing / why is it
// blocked" data. Read-only: it is owned by the engine, not the user.
function ExecutionMeta({ meta }) {
  const status = meta.status || "—"
  const interrupted = meta.interrupted_node || meta.interrupt_reason
  const err = meta.internal_data?.error

  const dotClass =
    status === "running"
      ? styles.running
      : status.startsWith("interrupted")
        ? styles.interrupted
        : status === "error"
          ? styles.error
          : ""

  const rows = [
    ["status", status, true],
    ["current_node", metaVal(meta.current_node)],
    ["step", metaVal(meta.step)],
    ["thread_id", metaVal(meta.thread_id)],
    ["stop_request", metaVal(meta.stop_current_execution)],
  ]

  return (
    <div className={styles.stCard}>
      <div className={styles.stCardHead}>
        <span className={styles.stCardTitle}>Execution Meta</span>
      </div>
      {rows.map(([k, v, isStatus]) => (
        <div className={styles.stMetaRow} key={k}>
          <span className={styles.stMetaKey}>{k}</span>
          <span className={styles.stMetaVal}>
            {isStatus && <span className={`${styles.stDot} ${dotClass}`} />}
            {v}
          </span>
        </div>
      ))}

      {/* Only surfaced when the run is actually blocked. */}
      {interrupted && (
        <>
          <div className={styles.stMetaRow}>
            <span className={styles.stMetaKey}>interrupted_node</span>
            <span className={styles.stMetaVal}>
              {metaVal(meta.interrupted_node)}
            </span>
          </div>
          <div className={styles.stMetaRow}>
            <span className={styles.stMetaKey}>interrupt_reason</span>
            <span className={styles.stMetaVal}>
              {metaVal(meta.interrupt_reason)}
            </span>
          </div>
          {meta.interrupt_data && (
            <div className={styles.stMetaRow}>
              <span className={styles.stMetaKey}>interrupt_data</span>
              <span className={styles.stMetaVal}>
                {metaVal(meta.interrupt_data)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Last engine error, if any. */}
      {err && (
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>error</span>
          <span className={`${styles.stMetaVal} ${styles.stInvalid}`}>
            {metaVal(err)}
          </span>
        </div>
      )}
    </div>
  )
}

function StatePane() {
  const dispatch = useDispatch()
  const threadId = useSelector((s) => s.chat.threadId)
  const schema = useSelector((s) => s.graph.stateSchema)
  const entry = useSelector((s) =>
    threadId ? s.threadState.byThread[threadId] : null
  )

  // Fetch this thread's state the first time the pane sees it (and re-fetch when
  // the active thread changes). Each thread keeps its own entry in Redux.
  useEffect(() => {
    if (threadId && !entry) dispatch(fetchThreadState(threadId))
  }, [threadId, entry, dispatch])

  if (!threadId) {
    return empty("No active thread — send a message first to create one.")
  }

  const status = entry?.status || "idle"
  const draft = entry?.draft
  const schemaProps = schema?.properties || {}

  // Union of schema-declared fields and whatever the state actually carries,
  // minus the fixed ones — this is the dynamic field list (not hardcoded).
  const dynamicKeys = [
    ...new Set([...Object.keys(schemaProps), ...Object.keys(draft || {})]),
  ].filter((k) => !FIXED_FIELDS.includes(k))

  // A nonce that changes whenever a fresh server snapshot lands, so dynamic
  // field editors re-seed cleanly (via key) without an effect. `server` is a new
  // object reference on each load, so JSON length is a cheap stand-in.
  const syncNonce = entry?.server ? JSON.stringify(entry.server).length : 0

  const context = draft?.context || []
  const meta = draft?.execution_meta || {}

  const onSync = () => dispatch(fetchThreadState(threadId))
  const onSave = () => dispatch(saveThreadState(threadId))

  return (
    <>
      <div className={styles.stActions}>
        <span className={styles.stThread}>thread {threadId}</span>
        <button
          className={styles.stBtn}
          type="button"
          onClick={onSync}
          disabled={status === "loading"}
        >
          <RefreshCw
            size={12}
            className={status === "loading" ? styles.spin : ""}
          />{" "}
          Sync
        </button>
        <button
          className={`${styles.stBtn} ${styles.primary}`}
          type="button"
          onClick={onSave}
          disabled={entry?.saving || !draft}
        >
          <Save size={12} /> {entry?.saving ? "Saving…" : "Save"}
        </button>
      </div>

      {entry?.error && (
        <div className={styles.stHint} style={{ marginBottom: 8 }}>
          {entry.error}
        </div>
      )}

      {status === "loading" && !draft ? (
        empty("Loading thread state…")
      ) : !draft ? (
        empty("No state yet for this thread.")
      ) : (
        <>
          {/* Context messages — read-only. The state `context` field uses an
              append-reducer server-side, so it can't be replaced via Save;
              editing/adding messages belongs to the Thread Inspector. Here we
              just show the short-term memory the run is working with. */}
          <div className={styles.stCard}>
            <div className={styles.stCardHead}>
              <span className={styles.stCardTitle}>
                Context{" "}
                <span className={styles.stCardCount}>({context.length})</span>
              </span>
            </div>
            <p className={styles.stCardDesc}>
              Short-term conversation memory (read-only).
            </p>
            {context.length === 0 && (
              <div className={styles.inspEmpty}>No messages.</div>
            )}
            {context.map((m, i) => {
              const text = messageText(m)
              return (
                <div className={styles.stMsg} key={m.message_id || i}>
                  <div className={styles.stMsgHead}>
                    <span
                      className={`${styles.stRole} ${styles[m.role] || ""}`}
                    >
                      {m.role || "message"}
                    </span>
                  </div>
                  <textarea
                    className={styles.stArea}
                    value={text || "(empty)"}
                    rows={Math.min(6, Math.max(2, text.split("\n").length))}
                    readOnly
                    spellCheck={false}
                  />
                </div>
              )
            })}
          </div>

          {/* Context summary (fixed field) */}
          <div className={styles.stCard}>
            <div className={styles.stCardHead}>
              <span className={styles.stCardTitle}>Context Summary</span>
            </div>
            <textarea
              className={styles.stArea}
              value={draft.context_summary || ""}
              rows={3}
              placeholder="Rolling summary of the conversation…"
              onChange={(e) =>
                dispatch(
                  setField({
                    threadId,
                    key: "context_summary",
                    value: e.target.value,
                  })
                )
              }
              spellCheck={false}
            />
          </div>

          {/* Execution metadata (fixed field, diagnostic / read-only) */}
          <ExecutionMeta meta={meta} />

          {/* Dynamic (graph-defined) fields — not fixed, editable */}
          <div className={styles.trajHead}>
            <span>Dynamic fields</span>
            <span className={styles.tjThread}>{dynamicKeys.length} fields</span>
          </div>
          {dynamicKeys.length === 0 ? (
            <div className={styles.inspEmpty}>
              No dynamic state fields on this graph.
            </div>
          ) : (
            dynamicKeys.map((key) => (
              <DynamicField
                key={`${key}:${syncNonce}`}
                fieldKey={key}
                info={schemaProps[key]}
                value={draft[key]}
                onChange={(v) =>
                  dispatch(setField({ threadId, key, value: v }))
                }
              />
            ))
          )}
        </>
      )}
    </>
  )
}

export default function Inspector({ onClose }) {
  const [tab, setTab] = useState("events")

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspHead}>
        <span className={styles.inspTitle}>Request Inspector</span>
        <div className={styles.inspTabs}>
          {TABS.map((t) => (
            <button
              key={t}
              className={tab === t ? styles.on : ""}
              onClick={() => setTab(t)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <button
          className={styles.inspClose}
          onClick={onClose}
          title="Close inspector"
        >
          <X size={14} />
        </button>
      </div>
      <div className={styles.inspBody}>
        {tab === "events" && <EventsPane />}
        {tab === "state" && <StatePane />}
        {tab === "graph" && <GraphPane />}
        {tab === "frames" && <FramesPane />}
        {tab === "curl" && <CurlPane />}
      </div>
    </aside>
  )
}
