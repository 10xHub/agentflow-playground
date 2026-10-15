import { Suspense, lazy, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { track } from "@/lib/analytics"
import { useConnection } from "@/lib/connection/connection-context"
import { PILLARS, calloutFor } from "@/lib/demo/callouts"

import styles from "./DemoBanner.module.css"

const GET_STARTED = "https://10xgraph.com/docs/get-started/"

// The sheet (and its dialog library) and the source both load on first open,
// so neither weighs on the main bundle.
const SourceSheet = lazy(() => import("./source-sheet"))
const loadSource = () =>
  import("../../../demo/agent/graph.py?raw").then((m) => m.default)

const SourceButton = () => {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState(null)

  const show = () => {
    setOpen(true)
    if (source) return
    track("demo_source")
    loadSource()
      .then(setSource)
      .catch(() => setSource("# The agent source could not be loaded."))
  }

  return (
    <>
      <button type="button" className={styles.action} onClick={show}>
        View agent source
      </button>
      {source === null && !open ? null : (
        <Suspense fallback={null}>
          <SourceSheet open={open} source={source} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}

/** Labels the recorded demo and ties each screen to a positioning pillar. */
const DemoBanner = () => {
  const { isDemo, disconnect } = useConnection()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!isDemo) return null
  const callout = calloutFor(pathname)

  const exit = () => {
    track("demo_exit")
    disconnect()
    navigate("/")
  }

  return (
    <div className={styles.banner} role="region" aria-label="Demo">
      <div className={styles.row}>
        <span className={styles.tag}>Recorded demo</span>
        <span className={styles.lead}>
          The data here was recorded from a real 10xGraph server. The
          agent&apos;s replies are scripted, so no model is called.
        </span>
        <div className={styles.actions}>
          <SourceButton />
          <a
            className={styles.action}
            href={GET_STARTED}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("demo_cta")}
          >
            Run it yourself
          </a>
          <button type="button" className={styles.action} onClick={exit}>
            Exit demo
          </button>
        </div>
      </div>
      {callout ? (
        <p className={styles.callout}>
          <span className={styles.pillar}>{PILLARS[callout.pillar]}</span>
          {callout.text}
        </p>
      ) : null}
    </div>
  )
}

export default DemoBanner
