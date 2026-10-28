import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { uploadMedia } from "@/lib/files/upload"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { loadFilesConfig } from "@/store/files-slice"

let counter = 0

/**
 * Composer attachments: pick, upload now, hold until the message is sent.
 * Limits come from the files config (loaded once, live servers only).
 * @param {boolean} enabled - false in the recorded demo
 * @returns {object} chips plus add, remove, clear and the files ready to send
 */
export const useAttachments = (enabled) => {
  const dispatch = useDispatch()
  const config = useSelector((s) => s.files?.config)
  const [chips, setChips] = useState([])
  const alive = useRef(true)
  const maxSizeMb = config?.maxSizeMb ?? undefined

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (enabled && (!config || config.status === "idle")) {
      dispatch(loadFilesConfig())
    }
  }, [enabled, config, dispatch])

  const patch = (key, next) =>
    alive.current &&
    setChips((all) => all.map((c) => (c.key === key ? { ...c, ...next } : c)))

  const add = async (file) => {
    counter += 1
    const key = `att-${counter}`
    setChips((all) => [
      ...all,
      { key, name: file.name, status: "uploading", error: null, data: null },
    ])
    try {
      const data = await uploadMedia(getTenxGraphClient(), file, { maxSizeMb })
      patch(key, { status: "ready", data })
    } catch (e) {
      patch(key, { status: "error", error: e.message })
    }
  }

  return {
    chips,
    add,
    remove: (key) => setChips((all) => all.filter((c) => c.key !== key)),
    clear: () => setChips([]),
    uploading: chips.some((c) => c.status === "uploading"),
    ready: chips.filter((c) => c.status === "ready").map((c) => c.data),
  }
}
