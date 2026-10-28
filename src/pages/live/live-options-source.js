// The one place that decides which live session options the server honors.
//
// Source: GET /v1/graph -> info.realtime_options.client_overrides
// (docs/contracts/threads-files-live-api.md, X10). Older servers do not send it; then
// this returns null, meaning "unknown, the server may ignore any of them".

export const LIVE_OPTION_KEYS = ["voice", "vad", "system_prompt"]

/**
 * @param {object|null|undefined} info - data.info from client.graph()
 * @returns {string[]|null} honored option keys, or null when the server does not say
 */
export const getHonoredLiveOptions = (info) => {
  const list = info?.realtime_options?.client_overrides
  return Array.isArray(list) ? list : null
}

const buildVad = (options) => {
  const vad = {}
  if (options.vadEnabled === false) vad.enabled = false
  const silence = Number(options.silenceMs)
  if (silence > 0) vad.silence_duration_ms = silence
  return Object.keys(vad).length > 0 ? vad : null
}

/**
 * Build the realtime init frame. Empty options are omitted. When the honored list is
 * known, options outside it are left out instead of sent and ignored.
 * @param {{voice?:string, vadEnabled?:boolean, silenceMs?:string|number, systemPrompt?:string}} options - form values
 * @param {string[]|null} honored - result of getHonoredLiveOptions
 * @returns {object} init frame for client.realtime()
 */
export const buildLiveInit = (options = {}, honored = null) => {
  const candidates = {
    voice: options.voice?.trim(),
    system_prompt: options.systemPrompt?.trim(),
    vad: buildVad(options),
  }
  const init = { modalities: "AUDIO" }
  for (const [key, value] of Object.entries(candidates)) {
    if (value && (honored === null || honored.includes(key))) init[key] = value
  }
  return init
}
