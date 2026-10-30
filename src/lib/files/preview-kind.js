const TEXT_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/javascript",
])

/**
 * Choose how to preview a file from its MIME type.
 * @param {string} [mime] - MIME type
 * @returns {"image"|"audio"|"video"|"pdf"|"text"|"none"} preview class
 */
export const previewKind = (mime) => {
  if (!mime) return "none"
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("video/")) return "video"
  if (mime === "application/pdf") return "pdf"
  if (mime.startsWith("text/") || TEXT_TYPES.has(mime)) return "text"
  return "none"
}

/**
 * Human size, base 1024.
 * @param {number} [bytes] - size in bytes
 * @returns {string} formatted size
 */
export const formatBytes = (bytes) => {
  if (typeof bytes !== "number") return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
