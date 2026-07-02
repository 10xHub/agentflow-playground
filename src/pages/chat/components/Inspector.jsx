import { Copy, Plus, RefreshCw, Save, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadGraphInfo } from "@/store/chatThunks"

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
// Bidirectional view of the current thread's AgentState. Three fields are fixed
// (context / context_summary / execution_meta); everything else is dynamic and
// schema-driven, so the field list is not hardcoded. DUMMY DATA for now — the
// Sync/Save buttons are placeholders until the checkpointer API is wired in.

const FIXED_FIELDS = ["context", "context_summary", "execution_meta", "state"]

// Stand-in state + schema. Mirrors what /v1/checkpointer thread state returns:
// a couple of fixed fields plus arbitrary dynamic fields defined by the graph.
const DUMMY_STATE = {
  context: [
    { message_id: "m1", role: "user", content: "What's the weather in Paris?" },
    {
      message_id: "m2",
      role: "assistant",
      content: "It's 18°C and clear in Paris right now.",
    },
  ],
  context_summary:
    "User is asking about weather. Assistant answered for Paris.",
  execution_meta: {
    current_node: "MAIN",
    step: 4,
    status: "idle",
    thread_id: "thread_demo_01",
    interrupted_node: null,
    interrupt_reason: "",
  },
  // --- dynamic (graph-defined) fields ---
  user_name: "Ada",
  turn_count: 3,
  preferences: { units: "metric", tone: "concise" },
}

const DUMMY_SCHEMA = {
  user_name: {
    title: "User Name",
    description: "Display name for the current user",
    type: "string",
  },
  turn_count: {
    title: "Turn Count",
    description: "Number of completed turns",
    type: "number",
  },
  preferences: {
    title: "Preferences",
    description: "Per-user settings object",
    type: "object",
  },
}

// Serialize a value for a text input; objects/arrays render as pretty JSON.
const toEditable = (v) =>
  typeof v === "string" ? v : JSON.stringify(v, null, 2)

// A dynamic field: JSON is parsed back to a value; anything else stays a string.
// The parent remounts this (via a key that includes the sync nonce) whenever a
// Sync replaces the state, so `raw` re-seeds from `value` without an effect.
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
          {info?.type || (structured ? "json" : "string")}
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

function StatePane() {
  const threadId = useSelector((s) => s.chat.threadId)

  // Local working copy of the state (the "form"); dummy for now.
  const [draft, setDraft] = useState(DUMMY_STATE)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  // Bumped on every Sync; part of each field's key so editors re-seed cleanly.
  const [syncNonce, setSyncNonce] = useState(0)

  const dynamicKeys = useMemo(
    () =>
      [
        ...new Set([...Object.keys(DUMMY_SCHEMA), ...Object.keys(draft)]),
      ].filter((k) => !FIXED_FIELDS.includes(k)),
    [draft]
  )

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const removeMessage = (idx) =>
    setDraft((d) => ({ ...d, context: d.context.filter((_, i) => i !== idx) }))

  const addMessage = () =>
    setDraft((d) => ({
      ...d,
      context: [
        ...d.context,
        { message_id: `m${d.context.length + 1}`, role: "user", content: "" },
      ],
    }))

  // Placeholders until the checkpointer API is connected.
  const onSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setDraft(DUMMY_STATE)
      setSyncNonce((n) => n + 1)
      setSyncing(false)
    }, 500)
  }
  const onSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 500)
  }

  const meta = draft.execution_meta || {}
  const status = meta.status || "idle"

  return (
    <>
      <div className={styles.stActions}>
        <span className={styles.stThread}>
          {threadId ? `thread ${threadId}` : "no active thread"}
        </span>
        <button
          className={styles.stBtn}
          type="button"
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw size={12} className={syncing ? styles.spin : ""} /> Sync
        </button>
        <button
          className={`${styles.stBtn} ${styles.primary}`}
          type="button"
          onClick={onSave}
          disabled={saving}
        >
          <Save size={12} /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Context messages (fixed field) */}
      <div className={styles.stCard}>
        <div className={styles.stCardHead}>
          <span className={styles.stCardTitle}>
            Context{" "}
            <span className={styles.stCardCount}>({draft.context.length})</span>
          </span>
          <button className={styles.stAdd} type="button" onClick={addMessage}>
            <Plus size={11} /> Add
          </button>
        </div>
        <p className={styles.stCardDesc}>Short-term conversation memory.</p>
        {draft.context.length === 0 && (
          <div className={styles.inspEmpty}>No messages.</div>
        )}
        {draft.context.map((m, i) => (
          <div className={styles.stMsg} key={m.message_id || i}>
            <div className={styles.stMsgHead}>
              <span className={`${styles.stRole} ${styles[m.role] || ""}`}>
                {m.role}
              </span>
              <button
                className={styles.stMsgDel}
                type="button"
                onClick={() => removeMessage(i)}
                title="Remove message"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              className={styles.stArea}
              value={
                typeof m.content === "string"
                  ? m.content
                  : JSON.stringify(m.content, null, 2)
              }
              rows={2}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  context: d.context.map((mm, ii) =>
                    ii === i ? { ...mm, content: e.target.value } : mm
                  ),
                }))
              }
              spellCheck={false}
            />
          </div>
        ))}
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
          onChange={(e) => setField("context_summary", e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Execution metadata (fixed field, mostly diagnostic) */}
      <div className={styles.stCard}>
        <div className={styles.stCardHead}>
          <span className={styles.stCardTitle}>Execution Meta</span>
        </div>
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>status</span>
          <span className={styles.stMetaVal}>
            <span className={`${styles.stDot} ${styles[status] || ""}`} />
            {status}
          </span>
        </div>
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>current_node</span>
          <span className={styles.stMetaVal}>{meta.current_node ?? "—"}</span>
        </div>
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>step</span>
          <span className={styles.stMetaVal}>{meta.step ?? "—"}</span>
        </div>
        <div className={styles.stMetaRow}>
          <span className={styles.stMetaKey}>thread_id</span>
          <span className={styles.stMetaVal}>{meta.thread_id ?? "—"}</span>
        </div>
      </div>

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
            info={DUMMY_SCHEMA[key]}
            value={draft[key]}
            onChange={(v) => setField(key, v)}
          />
        ))
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
