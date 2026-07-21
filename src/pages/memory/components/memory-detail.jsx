import { Pencil, Search, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch } from "react-redux"

import { deleteMemory } from "@/store/memory-slice"

import { embBars } from "../data"
import styles from "../memory.module.css"

/**
 *
 */
const MetaJson = ({ meta }) => {
  const entries = Object.entries(meta)
  return (
    <div className={styles.metaJson}>
      {"{\n"}
      {entries.map(([k, v], index) => (
        <span key={k}>
          {"  "}
          <span className={styles.key}>&quot;{k}&quot;</span>
          {": "}
          <span className={styles.str}>
            {typeof v === "string" ? `"${v}"` : v}
          </span>
          {index < entries.length - 1 ? ",\n" : "\n"}
        </span>
      ))}
      {"}"}
    </div>
  )
}

MetaJson.propTypes = {
  meta: PropTypes.object.isRequired,
}

/**
 *
 */
const MemoryDetail = ({ mem, mode, strategy, metric, collection, query }) => {
  const dispatch = useDispatch()
  const [delArmed, setDelArmed] = useState(false)
  const [armedFor, setArmedFor] = useState(mem.id)

  // Re-arm resets whenever the selected record changes (mirrors resetDelete()).
  if (armedFor !== mem.id) {
    setArmedFor(mem.id)
    setDelArmed(false)
  }

  const onDelete = () => {
    if (delArmed) {
      dispatch(deleteMemory(mem.id))
      setDelArmed(false)
    } else {
      setDelArmed(true)
    }
  }

  const search = mode === "search"
  const bars = embBars(mem.type).map((h, index) => ({ id: `bar-${index}`, h }))
  const typeColor = `var(--t-${mem.type})`

  return (
    <section className={styles.detail}>
      <div className={styles.dHead}>
        <div>
          <div className={styles.dId}>{mem.id}</div>
          <div className={styles.dBadges}>
            <span className={styles.tbadge}>
              <span className={`${styles.fd} ${styles[mem.type]}`} />
              {mem.type}
            </span>
            <span
              className={styles.tbadge}
              style={{ textTransform: "none", letterSpacing: 0 }}
            >
              {mem.cat}
            </span>
          </div>
        </div>
        <div className={styles.dActions}>
          <button className={styles.tbtn}>
            <Pencil size={14} strokeWidth={1.7} />
            Edit
          </button>
          <button
            className={`${styles.tbtn} ${styles.danger} ${delArmed ? styles.armed : ""}`}
            onClick={onDelete}
          >
            <Trash2 size={14} strokeWidth={1.7} />
            {delArmed ? "Confirm delete?" : "Delete"}
          </button>
        </div>
      </div>

      <div className={styles.dBody}>
        <div className={styles.secH}>Content</div>
        <div className={styles.contentBox}>{mem.content}</div>

        {search && (
          <div className={styles.match}>
            <div className={styles.matchH}>
              <Search size={15} strokeWidth={1.8} />
              Why this matched
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>query</span>
              <span className={styles.v}>&quot;{query}&quot;</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>retrieval_strategy</span>
              <span className={styles.v}>{strategy}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>distance_metric</span>
              <span className={styles.v}>{metric}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>score</span>
              <span className={`${styles.v} ${styles.ok}`}>
                {mem.score.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className={styles.grid2}>
          <div className={styles.card}>
            <div className={styles.secH}>Record</div>
            <div className={styles.kv}>
              <span className={styles.k}>memory_type</span>
              <span className={styles.v}>{mem.type}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>category</span>
              <span className={styles.v}>{mem.cat}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>user_id</span>
              <span className={styles.v}>
                {mem.meta?.user_id || "from token"}
              </span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>thread_id</span>
              <span className={styles.v}>{mem.thread}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>timestamp</span>
              <span className={styles.v}>{mem.ts}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.secH}>Vector</div>
            <div className={styles.emb}>
              {bars.map((b) => (
                <i
                  key={b.id}
                  style={{ height: `${b.h}%`, background: typeColor }}
                />
              ))}
            </div>
            <div className={styles.embMeta}>1536 dims · cosine</div>
            <div className={styles.kv} style={{ marginTop: 12 }}>
              <span className={styles.k}>collection</span>
              <span className={styles.v}>{collection}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>id</span>
              <span className={styles.v}>{mem.id}</span>
            </div>
          </div>
        </div>

        <div className={styles.secH}>metadata</div>
        <MetaJson meta={mem.meta} />
      </div>
    </section>
  )
}

MemoryDetail.propTypes = {
  mem: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    cat: PropTypes.string,
    content: PropTypes.string,
    score: PropTypes.number,
    thread: PropTypes.string,
    ts: PropTypes.string,
    meta: PropTypes.object,
  }).isRequired,
  mode: PropTypes.string.isRequired,
  strategy: PropTypes.string.isRequired,
  metric: PropTypes.string.isRequired,
  collection: PropTypes.string.isRequired,
  query: PropTypes.string.isRequired,
}

export default MemoryDetail
