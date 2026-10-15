import { useDispatch, useSelector } from "react-redux"

import { isDemoActive } from "@/lib/demo/demo-mode"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { searchMemories } from "@/store/memory-slice"

import styles from "../memory.module.css"

/**
 * Demo mode: says when results are a keyword fallback, and offers the searches
 * the recording holds, which ran the store's real vector search.
 */
const KeywordNote = () => {
  const dispatch = useDispatch()
  const keywordMatch = useSelector((s) => s.memory.keywordMatch)
  if (!keywordMatch || !isDemoActive()) return null
  const queries = getTenxGraphClient().recordedQueries?.() ?? []

  return (
    <div className={styles.keywordNote}>
      Keyword match (recorded demo). These searches ran the store&apos;s real
      vector search:
      {queries.map((q) => (
        <button
          key={q}
          type="button"
          className={styles.keywordChip}
          onClick={() => dispatch(searchMemories(q))}
        >
          {q}
        </button>
      ))}
    </div>
  )
}

export default KeywordNote
