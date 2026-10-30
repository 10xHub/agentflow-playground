import { ArrowRight, Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { track } from "@/lib/usage-events"

import styles from "./connect.module.css"

const INSTALL = "pip install 10xgraph 10xgraph-api"
const PLAY = "10xgraph dev"
const DOCS = "https://10xgraph.com/docs"

// Copy follows POSITIONING.md: lead with pillars 1 and 2, then ownership; no
// invented numbers or testimonials. Re-check it when the positioning changes.
// Ordered most important first (serial position): the server, then the moat.
const POINTS = [
  "Endpoints, JWT auth, scoped access and owner-only threads, generated from your graph",
  "Replay-safe tools: a crash and resume never repeats a charge or an email",
  "MIT licensed and self-hosted, with any model and no platform fees",
]

const FACTS = ["MIT", "Python 3.12+", "pre-1.0"]

// The replay-safe ledger, drawn as the run a reader would see. Amber marks only
// the skipped charge, so the one moment that matters stands out.
const RESUME = [
  { mark: "✓", tool: "lookup_order", note: "ran" },
  { mark: "✓", tool: "charge_card", note: "ran" },
  { mark: "✕", tool: "worker killed", note: "", tone: "bad" },
  { mark: "↻", tool: "resumed from checkpoint", note: "", tone: "muted" },
  { mark: "–", tool: "charge_card", note: "skipped, already ran", tone: "key" },
  { mark: "✓", tool: "send_receipt", note: "ran" },
]

/** The two install commands, with one copy button for both. */
const InstallCommand = () => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  const copy = () => {
    navigator.clipboard
      .writeText(`${INSTALL}\n${PLAY}`)
      .then(() => {
        setCopied(true)
        track("install_copy", { from: "connect" })
        return undefined
      })
      .catch(() => {})
  }

  const label = copied ? "Copied" : "Copy commands"

  return (
    <div className={styles.cmd}>
      <pre>
        <span className={styles.cmdPrompt}>$</span> {INSTALL}
        {"\n"}
        <span className={styles.cmdPrompt}>$</span> {PLAY}
      </pre>
      <button
        type="button"
        className={styles.cmdCopy}
        onClick={copy}
        aria-label={label}
        title={label}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

/**
 * Under the connect form, for visitors without a server: the recorded demo and
 * the one-line install. Outlined, so the form's button stays the only filled one.
 */
export const NoServer = () => {
  const navigate = useNavigate()
  const openDemo = () => {
    track("demo_cta", { from: "connect" })
    navigate("/demo")
  }

  return (
    <section className={styles.noServer} aria-labelledby="no-server-title">
      <h2 id="no-server-title" className={styles.sideH}>
        No server yet?
      </h2>
      <button type="button" className={styles.btnOutline} onClick={openDemo}>
        <span>
          <b>Explore the recorded demo</b>
          <small>A support agent with threads, traces, memory and evals</small>
        </span>
        <ArrowRight size={15} />
      </button>
      <InstallCommand />
    </section>
  )
}

/** The crash-and-resume run, as an illustration of the tool ledger. */
const ResumeTrace = () => (
  <figure className={styles.trace}>
    <div className={styles.traceBar}>
      <span>tool ledger</span>
      <span>thread order-1043</span>
    </div>
    <ol className={styles.traceRows}>
      {RESUME.map((row, index) => (
        // A fixed illustration; rows never reorder.
        // eslint-disable-next-line react/no-array-index-key
        <li key={index} className={styles[row.tone] ?? ""}>
          <span className={styles.traceMark}>{row.mark}</span>
          <span className={styles.traceTool}>{row.tool}</span>
          <span className={styles.traceNote}>{row.note}</span>
        </li>
      ))}
    </ol>
    <figcaption>
      Illustration: the worker dies after the charge. On resume, the ledger
      skips it, so the card is charged once.
    </figcaption>
  </figure>
)

/**
 * The brand side of the gateway: one claim, one proof, three points, and who
 * stands behind it. Nothing here competes with the connect form for a click.
 */
export const BrandPanel = () => (
  <aside className={styles.brand} aria-labelledby="brand-title">
    <div className={styles.brandInner}>
      <div className={styles.eyebrow}>Why 10xGraph</div>
      <h2 id="brand-title" className={styles.brandTitle}>
        Write the Python agent. 10xGraph builds the production server around it.
      </h2>
      <ResumeTrace />
      <ul className={styles.points}>
        {POINTS.map((point) => (
          <li key={point}>
            <Check size={15} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className={styles.brandFoot}>
        <p>Built and run in production by 10xScale for its own AI products.</p>
        <div className={styles.facts}>
          {FACTS.map((fact) => (
            <span key={fact} className={styles.pBadge}>
              {fact}
            </span>
          ))}
          <a
            className={styles.docsLink}
            href={DOCS}
            target="_blank"
            rel="noreferrer"
          >
            Read the docs <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  </aside>
)
