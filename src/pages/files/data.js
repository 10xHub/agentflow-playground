// Dummy file data mirroring docs/mockups/files.html and the real backend
// response shapes (GET /v1/files/{id}/info, /url, extracted_text).
// Swapped for live API data in a later pass — the API has NO list endpoint,
// so this "session" list is purely client-remembered.

export const MULTIMODAL_CONFIG = [
  { k: "media_storage_type", v: "local" },
  { k: "media_storage_path", v: "./media" },
  { k: "media_max_size_mb", v: "25" },
  { k: "document_handling", v: "extract_text" },
]

export const SESSION_FILES = [
  {
    id: "f1",
    cls: "doc",
    filename: "report_q2.pdf",
    file_id: "file_a71f3c2d…c04",
    mime: "application/pdf",
    size: 290816,
    extracted:
      "Q2 Growth report — revenue up 18.4% QoQ. Key drivers: expansion in APAC, improved retention (NRR 112%), and lower CAC. Risks: FX exposure, hiring pace.\n\nSection 2: Regional breakdown …",
    direct_url: "/v1/files/file_a71f3c2d…c04",
    expires: null,
  },
  {
    id: "f2",
    cls: "img",
    filename: "dhaka-forecast.png",
    file_id: "file_38dd91a0…9b1",
    mime: "image/png",
    size: 524288,
    extracted: null,
    direct_url: "https://cdn.acme.com/media/dhaka-forecast.png",
    expires: "2026-07-01 15:58",
  },
  {
    id: "f3",
    cls: "doc",
    filename: "launch-memo.docx",
    file_id: "file_5c9a04f2…2ff",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 45056,
    extracted:
      "Internal memo — launch timeline moved to Aug 12. Blockers: billing migration, load test sign-off.",
    direct_url: "/v1/files/file_5c9a04f2…2ff",
    expires: null,
  },
  {
    id: "f4",
    cls: "aud",
    filename: "standup.mp3",
    file_id: "file_e402ab7c…7ac",
    mime: "audio/mpeg",
    size: 2097152,
    extracted: null,
    direct_url: "/v1/files/file_e402ab7c…7ac",
    expires: null,
  },
]

/**
 *
 */
export const fmtSize = (b) => {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

/**
 *
 */
export const mimeShort = (m) => {
  if (m.startsWith("image/")) return m.split("/")[1].toUpperCase()
  if (m === "application/pdf") return "PDF"
  if (m.includes("wordprocessing")) return "DOCX"
  if (m.startsWith("audio/")) return m.split("/")[1].toUpperCase()
  return m
}

// Honest empty-extraction copy: images/audio are passed to the model as raw
// media blocks rather than text-extracted.
/**
 *
 */
export const emptyExtractNote = (mime) => {
  const kind = mime.startsWith("image/")
    ? "images"
    : mime.startsWith("audio/")
      ? "audio"
      : "this type"
  const block = mime.split("/")[0]
  return `null — ${kind} are not text-extracted; the raw file is passed to the model as a ${block} block.`
}
