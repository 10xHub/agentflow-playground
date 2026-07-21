import { Copy, RefreshCw, Save, X } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadGraphInfo } from "@/store/chat-thunks"
import {
  FIXED_FIELDS,
  fetchThreadState,
  saveThreadState,
  setField,
} from "@/store/state-slice"

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

// Log rows (events / frames / graph nodes) arrive without ids, so their key is
// their position paired with the content that identifies them.
const logKey = (index, ...parts) => [index, ...parts].join("|")

/**
 *
 */
const EventsPane = () => {
  const events = useSelector((s) => s.chat.events)
  if (!events.length) {
    return empty("No events yet — send a message to see the live stream.")
  }
  return (
    <>
      {events.map((e, index) => (
        <div className={styles.ev} key={logKey(index, e.type, e.time)}>
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

// The server names the graph pieces inconsistently across versions, so read the
// shape once and expose a single normalised view of it.
const readGraph = (info) => {
  const nodes = info.nodes || info.node_list || []
  const edges = info.edges || info.edge_list || []
  return {
    nodes,
    edges,
    nodeCount: (info.node_count ?? nodes.length) || 0,
    edgeCount: (info.edge_count ?? edges.length) || 0,
  }
}

// A node is either a bare string or an object with varying key names.
const nodeName = (n, index) =>
  typeof n === "string" ? n : n?.name || n?.id || `node ${index}`
const nodeMeta = (n) => (typeof n === "string" ? "" : n?.type || n?.kind || "")

/**
 *
 */
const GraphPane = () => {
  const dispatch = useDispatch()
  const graphInfo = useSelector((s) => s.chat.graphInfo)

  // Fetch the real structure the first time this tab is opened.
  useEffect(() => {
    if (!graphInfo) dispatch(loadGraphInfo())
  }, [graphInfo, dispatch])

  if (!graphInfo) return empty("Loading graph structure…")

  const { nodes, nodeCount, edgeCount } = readGraph(graphInfo)

  return (
    <>
      <div className={styles.trajHead}>
        <span>Graph structure</span>
        <span className={styles.tjThread}>
          {nodeCount} nodes · {edgeCount} edges
        </span>
      </div>
      {nodes.length ? (
        <div className={styles.traj}>
          {nodes.map((n, index) => {
            const name = nodeName(n, index)
            return (
              <div key={logKey(index, name)} className={styles.tstep}>
                <span className={styles.tdot} />
                <div className={styles.tinfo}>
                  <span className={styles.tname}>{name}</span>
                  <span className={styles.tmeta}>{nodeMeta(n)}</span>
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

/**
 *
 */
const FramesPane = () => {
  const frames = useSelector((s) => s.chat.frames)
  if (!frames.length) {
    return empty("No frames yet — the send/receive log appears here.")
  }
  return (
    <>
      {frames.map((f, index) => (
        <div className={styles.frame} key={logKey(index, f.dir, f.time)}>
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
const toCurl = (request) => {
  if (!request) return null
  const lines = [
    `curl ${request.mode === "invoke" ? "" : "-N "}-X ${request.method} '${request.url}' \\`,
  ]
  Object.entries(request.headers || {}).forEach(([k, v]) => {
    lines.push(`  -H '${k}: ${v}' \\`)
  })
  lines.push(`  -d '${JSON.stringify(request.body)}'`)
  return lines.join("\n")
}

/**
 *
 */
const CurlPane = () => {
  const request = useSelector((s) => s.chat.lastRequest)
  const [copied, setCopied] = useState(false)
  const curl = toCurl(request)

  if (!curl) {
    return empty("No request yet — send a message to generate a cURL command.")
  }

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
const metaValue = (v) => {
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

const toolResultText = (b) => {
  const tag = b.is_error || b.status === "failed" ? "⚠ tool error" : "↳ result"
  return `${tag}: ${asText(b.output ?? b.content)}`
}

// Media-ish blocks carry no readable text; they show as a bare type marker.
const MEDIA_TYPES = new Set(["image", "audio", "video", "document"])

const BLOCK_TEXT = {
  text: (b) => b.text || "",
  tool_call: (b) => `🛠 ${b.name}(${asText(b.args ?? {})})`,
  remote_tool_call: (b) => `🛠 ${b.name}(${asText(b.args ?? {})})`,
  tool_result: toolResultText,
  reasoning: (b) =>
    `💭 ${b.summary || (b.details || []).join(" ") || "reasoning"}`,
  error: (b) => `⚠ ${b.message || "error"}`,
  data: (b) => `[data ${b.mime_type || ""}]`,
}

// Render one content block to a readable line. Assistant/tool turns often carry
// NO text block — just tool_call / tool_result / reasoning — so a text-only
// extractor shows them as empty. This handles every block type the core emits.
const blockToText = (b) => {
  if (typeof b === "string") return b
  const render = BLOCK_TEXT[b?.type]
  if (render) return render(b)
  if (MEDIA_TYPES.has(b?.type)) return `[${b.type}]`
  return b?.type ? `[${b.type}]` : asText(b)
}

// Some providers nest the call under `function`, others put it on the entry.
const callTarget = (tc) => tc?.function || tc

const toolCallLine = (tc) => {
  const target = callTarget(tc)
  const name = target?.name || tc?.name || "tool"
  const arguments_ = target?.arguments ?? tc?.args ?? {}
  return `🛠 ${name}(${asText(arguments_)})`
}

// Message content is a plain string or a list of typed blocks. Join every block
// to a readable multi-line summary so assistant tool calls and tool results are
// visible instead of blank. Also fold in top-level tool call fields some
// providers put on the message (tools_calls / reasoning) when content is bare.
const messageText = (message) => {
  const content = message?.content ?? message
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
  if (Array.isArray(message?.tools_calls)) {
    message.tools_calls.forEach((tc) => lines.push(toolCallLine(tc)))
  }
  return lines.join("\n")
}

// Serialize a value for a text input; objects/arrays render as pretty JSON.
const toEditable = (v) =>
  typeof v === "string" ? v : JSON.stringify(v, null, 2)

// The declared type of a dynamic field; the schema may omit or array-wrap it.
const fieldType = (info, structured) => {
  const declared = Array.isArray(info?.type) ? info.type[0] : info?.type
  return declared || (structured ? "json" : "string")
}

// A dynamic field: JSON is parsed back to a value; anything else stays a string.
// The parent remounts this (via a key that includes the sync nonce) whenever a
// fresh load replaces the state, so `raw` re-seeds from `value` without an effect.
/**
 *
 */
const DynamicField = ({
  fieldKey,
  info = null,
  value = undefined,
  onChange,
}) => {
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
          {fieldType(info, structured)}
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

DynamicField.propTypes = {
  fieldKey: PropTypes.string.isRequired,
  info: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    type: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
  }),
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
}

// Diagnostic view of execution_meta — the "what is the run doing / why is it
// blocked" data. Read-only: it is owned by the engine, not the user.
/**
 *
 */
const ExecutionMeta = ({ meta }) => {
  const status = meta.status || "—"
  const interrupted = meta.interrupted_node || meta.interrupt_reason
  const error = meta.internal_data?.error

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
    ["current_node", metaValue(meta.current_node)],
    ["step", metaValue(meta.step)],
    ["thread_id", metaValue(meta.thread_id)],
    ["stop_request", metaValue(meta.stop_current_execution)],
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
              {metaValue(meta.interrupted_node)}
            </span>
          </div>
          <div className={styles.stMetaRow}>
            <span className={styles.stMetaKey}>interrupt_reason</span>
            <span className={styles.stMetaVal}>
              {metaValue(meta.interrupt_reason)}
            </span>
          </div>
          {meta.interrupt_data && (
            <div className={styles.stMetaRow}>
              <span className={styles.stMetaKey}>interrupt_data</span>
              <span className={styles.stMetaVal}>
                {metaValue(meta.interrupt_data)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Last engine error, if any. */}
      {error && (
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>error</span>
          <span className={`${styles.stMetaVal} ${styles.stInvalid}`}>
            {metaValue(error)}
          </span>
        </div>
      )}
    </div>
  )
}

ExecutionMeta.propTypes = {
  meta: PropTypes.shape({
    status: PropTypes.string,
    current_node: PropTypes.string,
    step: PropTypes.number,
    thread_id: PropTypes.string,
    stop_current_execution: PropTypes.bool,
    interrupted_node: PropTypes.string,
    interrupt_reason: PropTypes.string,
    interrupt_data: PropTypes.any,
    internal_data: PropTypes.shape({ error: PropTypes.any }),
  }).isRequired,
}

// Sync / Save controls for the current thread's state snapshot.
/**
 *
 */
const StateActions = ({
  threadId,
  loading,
  saving,
  canSave,
  onSync,
  onSave,
}) => (
  <div className={styles.stActions}>
    <span className={styles.stThread}>thread {threadId}</span>
    <button
      className={styles.stBtn}
      type="button"
      onClick={onSync}
      disabled={loading}
    >
      <RefreshCw size={12} className={loading ? styles.spin : ""} /> Sync
    </button>
    <button
      className={`${styles.stBtn} ${styles.primary}`}
      type="button"
      onClick={onSave}
      disabled={saving || !canSave}
    >
      <Save size={12} /> {saving ? "Saving…" : "Save"}
    </button>
  </div>
)

StateActions.propTypes = {
  threadId: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  canSave: PropTypes.bool.isRequired,
  onSync: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

// One context entry, flattened to readable text.
/**
 *
 */
const ContextMessage = ({ message }) => {
  const text = messageText(message)
  return (
    <div className={styles.stMsg}>
      <div className={styles.stMsgHead}>
        <span className={`${styles.stRole} ${styles[message.role] || ""}`}>
          {message.role || "message"}
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
}

ContextMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string,
  }).isRequired,
}

// Context messages — read-only. The state `context` field uses an
// append-reducer server-side, so it can't be replaced via Save; editing/adding
// messages belongs to the Thread Inspector. Here we just show the short-term
// memory the run is working with.
/**
 *
 */
const ContextCard = ({ context }) => (
  <div className={styles.stCard}>
    <div className={styles.stCardHead}>
      <span className={styles.stCardTitle}>
        Context <span className={styles.stCardCount}>({context.length})</span>
      </span>
    </div>
    <p className={styles.stCardDesc}>
      Short-term conversation memory (read-only).
    </p>
    {context.length === 0 && (
      <div className={styles.inspEmpty}>No messages.</div>
    )}
    {context.map((m, index) => (
      <ContextMessage key={m.message_id || index} message={m} />
    ))}
  </div>
)

ContextCard.propTypes = {
  context: PropTypes.arrayOf(PropTypes.shape({ message_id: PropTypes.string }))
    .isRequired,
}

// Union of schema-declared fields and whatever the state actually carries,
// minus the fixed ones — this is the dynamic field list (not hardcoded).
const dynamicFieldKeys = (schemaProperties, draft) =>
  [
    ...new Set([...Object.keys(schemaProperties), ...Object.keys(draft || {})]),
  ].filter((k) => !FIXED_FIELDS.includes(k))

// A nonce that changes whenever a fresh server snapshot lands, so dynamic field
// editors re-seed cleanly (via key) without an effect. `server` is a new object
// reference on each load, so JSON length is a cheap stand-in.
const serverNonce = (entry) =>
  entry?.server ? JSON.stringify(entry.server).length : 0

/**
 *
 */
const StateBody = ({ threadId, draft, schema = null, nonce }) => {
  const dispatch = useDispatch()
  const schemaProperties = schema?.properties || {}
  const dynamicKeys = dynamicFieldKeys(schemaProperties, draft)

  return (
    <>
      <ContextCard context={draft.context || []} />

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
      <ExecutionMeta meta={draft.execution_meta || {}} />

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
            key={`${key}:${nonce}`}
            fieldKey={key}
            info={schemaProperties[key]}
            value={draft[key]}
            onChange={(v) => dispatch(setField({ threadId, key, value: v }))}
          />
        ))
      )}
    </>
  )
}

StateBody.propTypes = {
  threadId: PropTypes.string.isRequired,
  draft: PropTypes.shape({
    context: PropTypes.array,
    context_summary: PropTypes.string,
    execution_meta: PropTypes.object,
  }).isRequired,
  schema: PropTypes.shape({ properties: PropTypes.object }),
  nonce: PropTypes.number.isRequired,
}

/**
 *
 */
const StatePane = () => {
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

  const draft = entry?.draft
  const loading = entry?.status === "loading"

  return (
    <>
      <StateActions
        threadId={threadId}
        loading={loading}
        saving={Boolean(entry?.saving)}
        canSave={Boolean(draft)}
        onSync={() => dispatch(fetchThreadState(threadId))}
        onSave={() => dispatch(saveThreadState(threadId))}
      />

      {entry?.error && (
        <div className={styles.stHint} style={{ marginBottom: 8 }}>
          {entry.error}
        </div>
      )}

      {draft ? (
        <StateBody
          threadId={threadId}
          draft={draft}
          schema={schema}
          nonce={serverNonce(entry)}
        />
      ) : (
        empty(
          loading ? "Loading thread state…" : "No state yet for this thread."
        )
      )}
    </>
  )
}

/**
 *
 */
const Inspector = ({ onClose }) => {
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

Inspector.propTypes = {
  onClose: PropTypes.func.isRequired,
}

export default Inspector
