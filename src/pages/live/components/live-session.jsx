import { AlertTriangle, Mic, Radio, Square } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { createMicCapture, createPcmPlayer } from "@/lib/realtime-audio"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { track } from "@/lib/usage-events"

import { buildLiveInit } from "../live-options-source"
import styles from "../live.module.css"

import {
  bindSessionEvents,
  formatToolRow,
  initialLiveState,
  liveReducer,
} from "./live-events"
import LiveOptions, { DEFAULT_LIVE_OPTIONS } from "./live-options"

// We deliberately do NOT send a `model` in the init frame. The init `model` is a
// per-session override that would win over the server's config, and Live model
// availability is key/region specific, so hardcoding one here caused sessions to close.
// Omitting it makes the model the server configures the single source of truth.

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
  name: PropTypes.string,
})

// Title, status dot and the start/end control.
/**
 *
 */
const SessionHeader = ({
  status,
  live,
  busy,
  stopped,
  agentName = null,
  onStart,
  onStop,
}) => (
  <div className={styles.sessHead}>
    <div className={styles.sessTitle}>
      <Radio size={16} strokeWidth={1.8} />
      Live session
    </div>
    <div className={styles.sessStatus}>
      <span className={`${styles.sdot} ${live ? styles.sdotLive : ""}`} />
      {STATUS_LABEL[status]}
    </div>
    {agentName && <div className={styles.agentChip}>agent: {agentName}</div>}
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
  agentName: PropTypes.string,
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
    {messages.map((m) =>
      m.role === "tool" ? (
        <div key={m.id} className={styles.toolRow}>
          {formatToolRow(m)}
        </div>
      ) : (
        <div
          key={m.id}
          className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.agent}`}
        >
          <span className={styles.bRole}>
            {m.role === "user" ? "you" : "agent"}
          </span>
          <span className={styles.bText}>{m.text}</span>
        </div>
      )
    )}
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

/**
 * Typed input row. Sends text to the live agent over the open session.
 */
const TextRow = ({ live, onSend }) => {
  const [value, setValue] = useState("")
  const submit = (event) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue("")
  }
  return (
    <form className={styles.textRow} onSubmit={submit}>
      <input
        className={styles.textInput}
        type="text"
        aria-label="Message to the agent"
        placeholder={live ? "Type a message" : "Start the session to type"}
        value={value}
        disabled={!live}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className={styles.sendBtn}
        type="submit"
        disabled={!live || !value.trim()}
      >
        Send
      </button>
    </form>
  )
}

TextRow.propTypes = {
  live: PropTypes.bool.isRequired,
  onSend: PropTypes.func.isRequired,
}

// Open the socket and wire it to the reducer. Returns the session or null on failure.
const openSession = (client, init, handlers) => {
  const session = client.realtime(init, { reconnect: { enabled: false } })
  bindSessionEvents(session, handlers)
  return session
}

// A voice-to-voice session over /v1/graph/live: push-to-talk streams mic PCM to the
// agent, the agent's audio plays back, and both transcripts stream in as text.
/**
 *
 */
const useLiveSession = (honored, options) => {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [live, dispatch] = useReducer(liveReducer, initialLiveState)
  const [recording, setRecording] = useState(false)
  const [threadId, setThreadId] = useState(null)

  const sessionReference = useRef(null)
  const playerReference = useRef(null)
  const micReference = useRef(null)
  const handleReference = useRef(null)
  const startedAtReference = useRef(null)

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
  }

  const start = () => {
    // Restart must not leak the previous socket or player.
    sessionReference.current?.close()
    teardown()

    let client
    try {
      client = getTenxGraphClient()
    } catch (e) {
      setError(e?.message || "Not connected")
      setStatus("error")
      return
    }

    dispatch({ type: "reset" })
    setError(null)
    setThreadId(null)
    handleReference.current = null
    setStatus("connecting")
    playerReference.current = createPcmPlayer()

    let session
    const handlers = {
      dispatch,
      onOpen: () => setStatus("live"),
      onAudio: (pcm, rate) => playerReference.current?.play(pcm, rate),
      flushAudio: () => playerReference.current?.flush?.(),
      onHandle: (handle) => {
        handleReference.current = handle
      },
      onError: (e) => {
        if (sessionReference.current !== session) return
        setError(e?.message || "Session error")
        // A non-fatal error keeps the session live; only a fatal one ends it.
        if (e?.fatal) {
          session.close()
          teardown()
          setStatus("error")
        }
      },
      onClose: () => {
        if (sessionReference.current !== session) return
        teardown()
        setStatus((s) => (s === "error" ? s : "ended"))
      },
    }
    try {
      // No `model`: the server's configured LIVE_MODEL is authoritative (see note above).
      session = openSession(client, buildLiveInit(options, honored), handlers)
    } catch (e) {
      setError(e?.message || "Failed to open session")
      setStatus("error")
      teardown()
      return
    }
    sessionReference.current = session
    setThreadId(session.threadId || null)

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

  const sendText = (text) => {
    sessionReference.current?.sendText(text)
    dispatch({ type: "transcript", role: "user", text, finished: true })
  }

  // Close the socket + mic if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      micReference.current?.stop()
      sessionReference.current?.close()
      playerReference.current?.close()
    }
  }, [])

  return {
    status,
    error,
    live,
    recording,
    threadId,
    start,
    stop,
    toggleMic,
    sendText,
  }
}

/**
 *
 */
const LiveSession = ({ honored = null }) => {
  const [options, setOptions] = useState(DEFAULT_LIVE_OPTIONS)
  const s = useLiveSession(honored, options)
  const scrollReference = useRef(null)

  useEffect(() => {
    scrollReference.current?.scrollTo({
      top: scrollReference.current.scrollHeight,
    })
  }, [s.live.messages])

  const isLive = s.status === "live"
  const busy = s.status === "connecting"
  const stopped =
    s.status === "idle" || s.status === "ended" || s.status === "error"

  return (
    <div className={styles.session}>
      <SessionHeader
        status={s.status}
        live={isLive}
        busy={busy}
        stopped={stopped}
        agentName={s.live.agentName}
        onStart={s.start}
        onStop={s.stop}
      />

      <LiveOptions
        value={options}
        onChange={setOptions}
        honored={honored}
        disabled={!stopped}
      />

      {s.error && (
        <div className={styles.sessErr}>
          <AlertTriangle size={14} /> {s.error}
        </div>
      )}

      {s.live.goAway && (
        <div className={styles.banner} role="status">
          <AlertTriangle size={14} /> The server will end this session in{" "}
          {s.live.goAway}.
        </div>
      )}

      <Transcript
        messages={s.live.messages}
        status={s.status}
        busy={busy}
        scrollRef={scrollReference}
      />

      {s.status === "ended" && s.threadId && (
        <div className={styles.threadNote}>
          Thread {s.threadId}.{" "}
          <Link to="/threads">Open the Thread Inspector</Link>
        </div>
      )}

      <TextRow live={isLive} onSend={s.sendText} />
      <VoiceBar live={isLive} recording={s.recording} onToggle={s.toggleMic} />
    </div>
  )
}

LiveSession.propTypes = {
  honored: PropTypes.arrayOf(PropTypes.string),
}

export default LiveSession
