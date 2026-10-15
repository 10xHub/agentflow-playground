import { Play } from "lucide-react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { track } from "@/lib/analytics"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { sendDemoRun } from "@/store/chat-thunks"

import styles from "../chat.module.css"

const INSTALL = "pip install 10xgraph 10xgraph-api"

/**
 * Demo mode: one chip per recorded run that can play now. Re-reads the client's
 * available runs after every run, since playing one unlocks the next.
 */
const DemoPrompts = ({ enabled = true }) => {
  const dispatch = useDispatch()
  // Re-render when a run starts or ends, which is when availability changes.
  const generating = useSelector((s) => s.chat.generating)
  if (!enabled) return null
  const runs = getTenxGraphClient().availableRuns()

  const play = (run) => {
    track("demo_prompt", { run: run.id })
    dispatch(sendDemoRun(run))
  }

  if (runs.length === 0) {
    return (
      <div className={styles.demoPrompts}>
        <span className={styles.demoDone}>
          That is the whole recording. Run it on your own agent:{" "}
          <code>{INSTALL}</code> then <code>10xgraph play</code>
        </span>
      </div>
    )
  }

  return (
    <div className={styles.demoPrompts} aria-label="Suggested prompts">
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          className={styles.demoChip}
          onClick={() => play(run)}
          disabled={generating}
          title={run.prompt}
        >
          <Play size={12} />
          {run.label}
        </button>
      ))}
    </div>
  )
}

DemoPrompts.propTypes = {
  enabled: PropTypes.bool,
}

export default DemoPrompts
