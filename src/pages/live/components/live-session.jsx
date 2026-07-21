import { AlertTriangle, Mic, Radio, Square } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useRef, useState } from "react"

import { getAgentFlowClient } from "@/lib/agentflow-client"
import { track } from "@/lib/analytics"
import { createMicCapture, createPcmPlayer } from "@/lib/realtime-audio"

import styles from "../live.module.css"

// We deliberately do NOT send a `model` in the init frame. The init `model` is a
// per-session override that would win over the server's config, and Live model
// availability is key/region specific — hardcoding one here caused sessions to close
// (model "not found for bidiGenerateContent"). Omitting it makes the server's LIVE_MODEL
// (agentflow-api/graph/live.py, env-overridable) the single source of truth.

const STATUS_LABEL = {
  idle: "Not started",
  connecting: "Connecting…",
  live: "Live",
  ended: "Session ended",
  error: "Error",
}

const scrollReferenceShape = PropTypes.shape({
  current: PropTypes.instanceOf(Element),
})

const messageShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  role: PropTypes.string.isRequired,
  text: PropTypes.string,
})

// Title, status dot and the start/end control.
/**
 *
 */
const SessionHeader = ({ status, live, busy, stopped, onStart, onStop }) => (
  <div className={styles.sessHead}>
    <div className={styles.sessTitle}>
      <Radio size={16} strokeWidth={1.8} />
      Live session
      <span className={styles.mockTag}>Gemini Live</span>
    </div>
    <div className={styles.sessStatus}>
      <span className={`${styles.sdot} ${live ? styles.sdotLive : ""}`} />
      {STATUS_LABEL[status]}
    </div>
    {stopped ? (
      <button
        className={styles.startBtn}
        onClick={onStart}
        disabled={busy}
        type="button"
      >
        {status === "idle" ? "Start session" : "Restart"}
      </button>
    ) : (
      <button className={styles.endBtn} onClick={onStop} type="button">
        <Square size={13} /> End
      </button>
    )}
  </div>
)

SessionHeader.propTypes = {
  status: PropTypes.string.isRequired,
  live: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  stopped: PropTypes.bool.isRequired,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
}

/**
 *
 */
const emptyHint = (status, busy) => {
  if (status === "idle") {
    return "Start the session, then hold the mic to talk to the agent."
  }
  if (busy) return "Connecting to the live socket…"
  return "Tap the mic and speak."
}

// Interleaved user/agent transcript, auto-scrolled by the parent via scrollRef.
/**
 *
 */
const Transcript = ({ messages, status, busy, scrollRef }) => (
  <div className={styles.transcript} ref={scrollRef}>
    {messages.length === 0 && (
      <div className={styles.sessEmpty}>{emptyHint(status, busy)}</div>
    )}
    {messages.map((m) => (
      <div
        key={m.id}
        className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.agent}`}
      >
        <span className={styles.bRole}>
          {m.role === "user" ? "you" : "agent"}
        </span>
        <span className={styles.bText}>{m.text}</span>
      </div>
    ))}
  </div>
)

Transcript.propTypes = {
  messages: PropTypes.arrayOf(messageShape).isRequired,
  status: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  scrollRef: scrollReferenceShape.isRequired,
}

/**
 *
 */
const voiceHint = (live, recording) => {
  if (!live) return "Start the session to talk"
  return recording ? "Listening… tap to send" : "Tap to talk"
}

// Push-to-talk control.
/**
 *
 */
const VoiceBar = ({ live, recording, onToggle }) => (
  <div className={styles.voiceBar}>
    <button
      className={`${styles.micBtn} ${recording ? styles.micOn : ""}`}
      onClick={onToggle}
      disabled={!live}
      type="button"
      aria-pressed={recording}
    >
      <Mic size={22} strokeWidth={1.8} />
    </button>
    <div className={styles.voiceHint}>{voiceHint(live, recording)}</div>
  </div>
)

VoiceBar.propTypes = {
  live: PropTypes.bool.isRequired,
  recording: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
}

// A voice-to-voice session over /v1/graph/live: push-to-talk streams mic PCM to the
// agent, the agent's audio plays back, and both transcripts stream in as text.
/**
 *
 */
const LiveSession = () => {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [recording, setRecording] = useState(false)

  const sessionReference = useRef(null)
  const playerReference = useRef(null)
  const micReference = useRef(null)
  const openReference = useRef({ user: null, agent: null })
  const idReference = useRef(0)
  const scrollReference = useRef(null)
  const startedAtReference = useRef(null)

  useEffect(() => {
    scrollReference.current?.scrollTo({
      top: scrollReference.current.scrollHeight,
    })
  }, [messages])

  // Append a transcript delta, coalescing consecutive chunks from the same speaker
  // into one message until its `finished` marker arrives.
  const appendTranscript = (role, text, finished) => {
    setMessages((previous) => {
      const openId = openReference.current[role]
      if (openId == null) {
        const id = (idReference.current += 1)
        openReference.current[role] = finished ? null : id
        return [...previous, { id, role, text, done: finished }]
      }
      const next = previous.map((m) =>
        m.id === openId ? { ...m, text: m.text + text, done: finished } : m
      )
      if (finished) openReference.current[role] = null
      return next
    })
  }

  const stopMic = () => {
    micReference.current?.stop()
    micReference.current = null
    setRecording(false)
  }

  const teardown = () => {
    stopMic()
    playerReference.current?.close()
    playerReference.current = null
    sessionReference.current = null
    openReference.current = { user: null, agent: null }
  }

  const start = () => {
    let client
    try {
      client = getAgentFlowClient()
    } catch (e) {
      setError(e?.message || "Not connected")
      setStatus("error")
      return
    }

    setMessages([])
    setError(null)
    setStatus("connecting")
    openReference.current = { user: null, agent: null }
    playerReference.current = createPcmPlayer()

    let session
    try {
      // Reconnect disabled: a session ends once, so `close` is terminal here. No `model`:
      // the server's configured LIVE_MODEL is authoritative (see note above).
      session = client.realtime(
        { modalities: "AUDIO" },
        { reconnect: { enabled: false } }
      )
    } catch (e) {
      setError(e?.message || "Failed to open session")
      setStatus("error")
      teardown()
      return
    }
    sessionReference.current = session

    session.on("open", () => setStatus("live"))
    session.on("audio", (pcm, rate) => playerReference.current?.play(pcm, rate))
    session.on("input_transcript", (e) =>
      appendTranscript("user", e.text || "", e.finished)
    )
    session.on("output_transcript", (e) =>
      appendTranscript("agent", e.text || "", e.finished)
    )
    session.on("error", (e) => {
      setError(e?.message || "Session error")
      setStatus("error")
    })
    session.on("close", () => {
      teardown()
      setStatus((s) => (s === "error" ? s : "ended"))
    })

    // After the early returns above, so failed opens are not counted as starts.
    startedAtReference.current = Date.now()
    track("live_session_started")
  }

  const stop = () => {
    sessionReference.current?.close()
    teardown()
    setStatus("ended")
    // Guarded so no `ended` fires without a matching `started`. Transcripts and
    // audio are never sent.
    if (startedAtReference.current) {
      track("live_session_ended", {
        duration_seconds: Math.round(
          (Date.now() - startedAtReference.current) / 1000
        ),
      })
      startedAtReference.current = null
    }
  }

  // Push-to-talk: tap to open the mic (activity_start + stream PCM), tap again to
  // end the turn (activity_end) so the agent responds.
  const toggleMic = async () => {
    if (status !== "live") return
    if (recording) {
      stopMic()
      sessionReference.current?.activityEnd()
      return
    }
    try {
      sessionReference.current?.activityStart()
      micReference.current = await createMicCapture((frame) =>
        sessionReference.current?.sendAudio(frame)
      )
      setRecording(true)
    } catch (e) {
      setError(e?.message || "Microphone unavailable")
      sessionReference.current?.activityEnd()
    }
  }

  // Close the socket + mic if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      micReference.current?.stop()
      sessionReference.current?.close()
      playerReference.current?.close()
    }
  }, [])

  const live = status === "live"
  const busy = status === "connecting"
  const stopped = status === "idle" || status === "ended" || status === "error"

  return (
    <div className={styles.session}>
      <SessionHeader
        status={status}
        live={live}
        busy={busy}
        stopped={stopped}
        onStart={start}
        onStop={stop}
      />

      {status === "error" && error && (
        <div className={styles.sessErr}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <Transcript
        messages={messages}
        status={status}
        busy={busy}
        scrollRef={scrollReference}
      />

      <VoiceBar live={live} recording={recording} onToggle={toggleMic} />
    </div>
  )
}

export default LiveSession
