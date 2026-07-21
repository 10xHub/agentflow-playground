import { useSelector } from "react-redux"

import ct from "@constants/"

// Fallbacks used before the server config has loaded (or if it fails). The
// server's own default is 25MB; we stay conservative until we know.
export const DEFAULT_MAX_SIZE_MB = 10
export const DEFAULT_DOCUMENT_HANDLING = "extract_text"

// Picker hints only. The server accepts any type, so these drive the file
// dialog's `accept` filter, not a hard client-side rejection.
export const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.gif,.svg,.webp"
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.txt,.csv,.json"

/**
 * Build the file input `accept` string from the server's document handling.
 * When documents are skipped, only images make sense to attach.
 * @param {string} documentHandling - "extract_text" | "pass_raw" | "skip"
 * @returns {string} comma-separated extension list
 */
export const getAcceptString = (documentHandling) =>
  documentHandling === "skip"
    ? IMAGE_ACCEPT
    : `${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`

/**
 * Convert a megabyte limit to bytes for size comparisons.
 * @param {number} maxSizeMb - the limit in megabytes
 * @returns {number} the limit in bytes
 */
export const getMaxSizeBytes = (maxSizeMb) =>
  (Number(maxSizeMb) || DEFAULT_MAX_SIZE_MB) * 1024 * 1024

/**
 * Read the multimodal config from the store and return derived limits the
 * attachment inputs need. Falls back to safe defaults before the config loads.
 * @returns {{ maxSizeMb: number, maxSizeBytes: number, documentHandling: string, accept: string }} derived attachment limits
 */
export const useMultimodalConfig = () => {
  const config = useSelector((state) => state[ct.store.MULTIMODAL_STORE])
  const maxSizeMb = config?.maxSizeMb ?? DEFAULT_MAX_SIZE_MB
  const documentHandling = config?.documentHandling ?? DEFAULT_DOCUMENT_HANDLING
  return {
    maxSizeMb,
    maxSizeBytes: getMaxSizeBytes(maxSizeMb),
    documentHandling,
    accept: getAcceptString(documentHandling),
  }
}
