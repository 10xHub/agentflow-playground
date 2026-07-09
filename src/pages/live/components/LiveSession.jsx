import { AlertTriangle, Mic, Radio, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { getAgentFlowClient } from "@/lib/agentflow-client"
import { createMicCapture, createPcmPlayer } from "@/lib/realtime-audio"

import styles from "../live.module.css"

// The server's mock live agent is fixed to this model; the init frame's model is
// only an override, so any value works, but we send the real one for clarity.
const LIVE_MODEL = "gemini-2.5-flash-live"

const STATUS_LABEL = {
  idle: "Not started",
  connecting: "Connecting…",
  live: "Live",
  ended: "Session ended",
  error: "Error",
}

// A voice-to-voice session over /v1/graph/live: push-to-talk streams mic PCM to the
// agent, the agent's audio plays back, and both transcripts stream in as text.
export default function LiveSession() {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [recording, setRecording] = useState(false)

  const sessionRef = useRef(null)
  const playerRef = useRef(null)
  const micRef = useRef(null)
  const openRef = useRef({ user: null, agent: null })
  const idRef = useRef(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Append a transcript delta, coalescing consecutive chunks from the same speaker
  // into one message until its `finished` marker arrives.
  const appendTranscript = (role, text, finished) => {
    setMessages((prev) => {
      const openId = openRef.current[role]
      if (openId == null) {
        const id = (idRef.current += 1)
        openRef.current[role] = finished ? null : id
        return [...prev, { id, role, text, done: finished }]
      }
      const next = prev.map((m) =>
        m.id === openId ? { ...m, text: m.text + text, done: finished } : m
      )
      if (finished) openRef.current[role] = null
      return next
    })
  }

  const stopMic = () => {
    micRef.current?.stop()
    micRef.current = null
    setRecording(false)
  }

  const teardown = () => {
    stopMic()
    playerRef.current?.close()
    playerRef.current = null
    sessionRef.current = null
    openRef.current = { user: null, agent: null }
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
    openRef.current = { user: null, agent: null }
    playerRef.current = createPcmPlayer()

    let session
    try {
      // Reconnect disabled: a session ends once, so `close` is terminal here.
      session = client.realtime(
        { model: LIVE_MODEL, modalities: "AUDIO" },
        { reconnect: { enabled: false } }
      )
    } catch (e) {
      setError(e?.message || "Failed to open session")
      setStatus("error")
      teardown()
      return
    }
    sessionRef.current = session

    session.on("open", () => setStatus("live"))
    session.on("audio", (pcm, rate) => playerRef.current?.play(pcm, rate))
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
  }

  const stop = () => {
    sessionRef.current?.close()
    teardown()
    setStatus("ended")
  }

  // Push-to-talk: tap to open the mic (activity_start + stream PCM), tap again to
  // end the turn (activity_end) so the agent responds.
  const toggleMic = async () => {
    if (status !== "live") return
    if (recording) {
      stopMic()
      sessionRef.current?.activityEnd()
      return
    }
    try {
      sessionRef.current?.activityStart()
      micRef.current = await createMicCapture((frame) =>
        sessionRef.current?.sendAudio(frame)
      )
      setRecording(true)
    } catch (e) {
      setError(e?.message || "Microphone unavailable")
      sessionRef.current?.activityEnd()
    }
  }

  // Close the socket + mic if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      micRef.current?.stop()
      sessionRef.current?.close()
      playerRef.current?.close()
    }
  }, [])

  const live = status === "live"
  const busy = status === "connecting"
  const stopped = status === "idle" || status === "ended" || status === "error"

  return (
    <div className={styles.session}>
      <div className={styles.sessHead}>
        <div className={styles.sessTitle}>
          <Radio size={16} strokeWidth={1.8} />
          Live session
          <span className={styles.mockTag}>mock agent</span>
        </div>
        <div className={styles.sessStatus}>
          <span className={`${styles.sdot} ${live ? styles.sdotLive : ""}`} />
          {STATUS_LABEL[status]}
        </div>
        {stopped ? (
          <button
            className={styles.startBtn}
            onClick={start}
            disabled={busy}
            type="button"
          >
            {status === "idle" ? "Start session" : "Restart"}
          </button>
        ) : (
          <button className={styles.endBtn} onClick={stop} type="button">
            <Square size={13} /> End
          </button>
        )}
      </div>

      {status === "error" && error && (
        <div className={styles.sessErr}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className={styles.transcript} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.sessEmpty}>
            {status === "idle"
              ? "Start the session, then hold the mic to talk to the agent."
              : busy
                ? "Connecting to the live socket…"
                : "Tap the mic and speak."}
          </div>
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

      <div className={styles.voiceBar}>
        <button
          className={`${styles.micBtn} ${recording ? styles.micOn : ""}`}
          onClick={toggleMic}
          disabled={!live}
          type="button"
          aria-pressed={recording}
        >
          <Mic size={22} strokeWidth={1.8} />
        </button>
        <div className={styles.voiceHint}>
          {!live
            ? "Start the session to talk"
            : recording
              ? "Listening… tap to send"
              : "Tap to talk"}
        </div>
      </div>
    </div>
  )
}
