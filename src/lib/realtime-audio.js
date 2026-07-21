// Minimal PCM16 playback for realtime audio_delta frames. The live session emits
// mono PCM16 little-endian at 24 kHz; we decode each frame to a Float32 AudioBuffer
// and schedule frames back-to-back so they play as one continuous stream.
//
// AudioContext must be created/resumed from a user gesture (the "Start" click), so
// callers should construct the player in response to that gesture.

/**
 *
 */
export const createPcmPlayer = (defaultSampleRate = 24000) => {
  let context = null
  let nextTime = 0

  const ensureContext = () => {
    if (!context) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      context = new Ctor()
    }
    if (context.state === "suspended") context.resume()
    return context
  }

  return {
    /** Queue one PCM16 frame (Uint8Array, little-endian mono) for playback. */
    play: (pcmBytes, sampleRate = defaultSampleRate) => {
      if (!pcmBytes || pcmBytes.byteLength < 2) return
      const c = ensureContext()
      const frames = Math.floor(pcmBytes.byteLength / 2)
      const view = new DataView(
        pcmBytes.buffer,
        pcmBytes.byteOffset,
        pcmBytes.byteLength
      )
      const buffer = c.createBuffer(1, frames, sampleRate)
      const channel = buffer.getChannelData(0)
      for (let index = 0; index < frames; index++) {
        channel[index] = view.getInt16(index * 2, true) / 32768
      }
      const source = c.createBufferSource()
      source.buffer = buffer
      source.connect(c.destination)
      const startAt = Math.max(c.currentTime, nextTime)
      source.start(startAt)
      nextTime = startAt + buffer.duration
    },

    /** Tear down the audio context. */
    close: () => {
      if (context) {
        try {
          context.close()
        } catch {
          /* already closed */
        }
        context = null
        nextTime = 0
      }
    },
  }
}

// Capture the microphone as PCM16 mono @ 16 kHz (the realtime input rate) and hand
// each frame to `onFrame` as a Uint8Array. Returns a handle with stop(). Must be
// called from a user gesture (mic permission + AudioContext both need one).
/**
 *
 */
export const createMicCapture = async (onFrame, sampleRate = 16000) => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const Ctor = window.AudioContext || window.webkitAudioContext
  // Requesting the context at 16 kHz makes the browser resample the mic for us.
  const context = new Ctor({ sampleRate })
  if (context.state === "suspended") await context.resume()

  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(4096, 1, 1)
  // Route through a muted gain node so onaudioprocess fires without echoing the
  // mic back to the speakers.
  const sink = context.createGain()
  sink.gain.value = 0

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0)
    const pcm = new Int16Array(input.length)
    for (let index = 0; index < input.length; index++) {
      const s = Math.max(-1, Math.min(1, input[index]))
      pcm[index] = s < 0 ? s * 32768 : s * 32767
    }
    onFrame(new Uint8Array(pcm.buffer))
  }

  source.connect(processor)
  processor.connect(sink)
  sink.connect(context.destination)

  return {
    stop: () => {
      try {
        processor.disconnect()
        source.disconnect()
        sink.disconnect()
      } catch {
        /* already torn down */
      }
      stream.getTracks().forEach((t) => t.stop())
      try {
        context.close()
      } catch {
        /* already closed */
      }
    },
  }
}
