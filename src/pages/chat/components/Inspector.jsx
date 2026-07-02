import { Copy, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadGraphInfo } from "@/store/chatThunks"

import styles from "../chat.module.css"

const TABS = ["events", "graph", "frames", "curl"]
const TAB_LABEL = { events: "Events", graph: "Graph", frames: "Frames", curl: "cURL" }

const empty = (text) => <div className={styles.inspEmpty}>{text}</div>

function EventsPane() {
  const events = useSelector((s) => s.chat.events)
  if (!events.length) return empty("No events yet — send a message to see the live stream.")
  return (
    <>
      {events.map((e, i) => (
        <div className={styles.ev} key={i}>
          <div className={styles.evH}>
            <span className={`${styles.evType} ${styles[e.type] || ""}`}>{e.type}</span>
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
            const name = typeof n === "string" ? n : n?.name || n?.id || `node ${i}`
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
        <pre className={styles.curlbox}>{JSON.stringify(graphInfo, null, 2)}</pre>
      )}
    </>
  )
}

function FramesPane() {
  const frames = useSelector((s) => s.chat.frames)
  if (!frames.length) return empty("No frames yet — the send/receive log appears here.")
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
  const lines = [`curl ${req.mode === "invoke" ? "" : "-N "}-X ${req.method} '${req.url}' \\`]
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

  if (!curl) return empty("No request yet — send a message to generate a cURL command.")

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

export default function Inspector({ onClose }) {
  const [tab, setTab] = useState("events")

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspHead}>
        <span className={styles.inspTitle}>Request Inspector</span>
        <div className={styles.inspTabs}>
          {TABS.map((t) => (
            <button key={t} className={tab === t ? styles.on : ""} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <button className={styles.inspClose} onClick={onClose} title="Close inspector">
          <X size={14} />
        </button>
      </div>
      <div className={styles.inspBody}>
        {tab === "events" && <EventsPane />}
        {tab === "graph" && <GraphPane />}
        {tab === "frames" && <FramesPane />}
        {tab === "curl" && <CurlPane />}
      </div>
    </aside>
  )
}
