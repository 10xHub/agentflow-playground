// Reusable upload helper for the Files page and chat attachments.
//
//   uploadMedia(client, file, { maxSizeMb }) -> Promise<FileUploadResponse["data"]>
//     Checks the size locally, calls client.uploadFile and rejects with an Error whose
//     message is plain text (413, 415 and 400 mapped). The original error is on `.cause`.
//   uploadErrorMessage(error, maxSizeMb) -> string
//   checkFileSize(file, maxSizeMb) -> string | null

const BYTES_PER_MB = 1024 * 1024

const tooLarge = (maxSizeMb) =>
  maxSizeMb ? `File is larger than ${maxSizeMb} MB` : "File is too large"

export const EMPTY_FILE_MESSAGE = "Empty file or missing name"

/**
 * Map an upload failure to plain text.
 * @param {unknown} error - error thrown by the client
 * @param {number} [maxSizeMb] - configured limit, used for 413
 * @returns {string} message for the user
 */
export const uploadErrorMessage = (error, maxSizeMb) => {
  const status = error?.statusCode ?? error?.status
  if (status === 413) return tooLarge(maxSizeMb)
  if (status === 415) return "This file type is not allowed"
  if (status === 400) return EMPTY_FILE_MESSAGE
  return error?.message || "Upload failed"
}

/**
 * Local pre-check so an oversized or empty file never leaves the browser.
 * @param {{size: number}} file - picked file
 * @param {number} [maxSizeMb] - limit from the multimodal config
 * @returns {string | null} error message, or null when the file is acceptable
 */
export const checkFileSize = (file, maxSizeMb) => {
  if (!file || file.size === 0) return EMPTY_FILE_MESSAGE
  if (maxSizeMb && file.size > maxSizeMb * BYTES_PER_MB) {
    return tooLarge(maxSizeMb)
  }
  return null
}

/**
 * Upload one file through the client.
 * @param {object} client - TenxGraphClient (or DemoClient)
 * @param {File|Blob} file - file to upload
 * @param {{maxSizeMb?: number}} [options] - limits
 * @returns {Promise<object>} the `data` of the upload response
 */
export const uploadMedia = async (client, file, { maxSizeMb } = {}) => {
  const problem = checkFileSize(file, maxSizeMb)
  if (problem) throw new Error(problem)
  try {
    const res = await client.uploadFile(file)
    return res?.data ?? res
  } catch (cause) {
    throw new Error(uploadErrorMessage(cause, maxSizeMb), { cause })
  }
}
