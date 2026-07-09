// Minimal PCM16 playback for realtime audio_delta frames. The live session emits
// mono PCM16 little-endian at 24 kHz; we decode each frame to a Float32 AudioBuffer
// and schedule frames back-to-back so they play as one continuous stream.
//
// AudioContext must be created/resumed from a user gesture (the "Start" click), so
// callers should construct the player in response to that gesture.

export function createPcmPlayer(defaultSampleRate = 24000) {
  let ctx = null
  let nextTime = 0

  const ensureCtx = () => {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      ctx = new Ctor()
    }
    if (ctx.state === "suspended") ctx.resume()
    return ctx
  }

  return {
    /** Queue one PCM16 frame (Uint8Array, little-endian mono) for playback. */
    play(pcmBytes, sampleRate = defaultSampleRate) {
      if (!pcmBytes || pcmBytes.byteLength < 2) return
      const c = ensureCtx()
      const frames = Math.floor(pcmBytes.byteLength / 2)
      const view = new DataView(
        pcmBytes.buffer,
        pcmBytes.byteOffset,
        pcmBytes.byteLength
      )
      const buffer = c.createBuffer(1, frames, sampleRate)
      const channel = buffer.getChannelData(0)
      for (let i = 0; i < frames; i++) {
        channel[i] = view.getInt16(i * 2, true) / 32768
      }
      const source = c.createBufferSource()
      source.buffer = buffer
      source.connect(c.destination)
      const startAt = Math.max(c.currentTime, nextTime)
      source.start(startAt)
      nextTime = startAt + buffer.duration
    },

    /** Tear down the audio context. */
    close() {
      if (ctx) {
        try {
          ctx.close()
        } catch {
          /* already closed */
        }
        ctx = null
        nextTime = 0
      }
    },
  }
}

// Capture the microphone as PCM16 mono @ 16 kHz (the realtime input rate) and hand
// each frame to `onFrame` as a Uint8Array. Returns a handle with stop(). Must be
// called from a user gesture (mic permission + AudioContext both need one).
export async function createMicCapture(onFrame, sampleRate = 16000) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const Ctor = window.AudioContext || window.webkitAudioContext
  // Requesting the context at 16 kHz makes the browser resample the mic for us.
  const ctx = new Ctor({ sampleRate })
  if (ctx.state === "suspended") await ctx.resume()

  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  // Route through a muted gain node so onaudioprocess fires without echoing the
  // mic back to the speakers.
  const sink = ctx.createGain()
  sink.gain.value = 0

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0)
    const pcm = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      pcm[i] = s < 0 ? s * 32768 : s * 32767
    }
    onFrame(new Uint8Array(pcm.buffer))
  }

  source.connect(processor)
  processor.connect(sink)
  sink.connect(ctx.destination)

  return {
    stop() {
      try {
        processor.disconnect()
        source.disconnect()
        sink.disconnect()
      } catch {
        /* already torn down */
      }
      stream.getTracks().forEach((t) => t.stop())
      try {
        ctx.close()
      } catch {
        /* already closed */
      }
    },
  }
}
