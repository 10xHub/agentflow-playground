"use client"
import { useCallback, useEffect, useRef, useState } from "react"
/**
 *
 */
const writeClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {}
  const active = document.activeElement
  const selection = document.getSelection()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index)
      )
    : []
  const area = document.createElement("textarea")
  area.value = text
  area.style.cssText = `position:absolute;left:-9999px;top:${window.scrollY || document.documentElement.scrollTop}px;width:1px;height:1px;font-size:16px;border:0;padding:0;margin:0;`
  document.body.appendChild(area)
  area.contentEditable = "true"
  area.readOnly = false
  const range = document.createRange()
  range.selectNodeContents(area)
  selection?.removeAllRanges()
  selection?.addRange(range)
  area.select()
  area.setSelectionRange(0, text.length)
  area.contentEditable = "false"
  area.readOnly = true
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  area.remove()
  if (selection) {
    selection.removeAllRanges()
    ranges.forEach((range2) => selection.addRange(range2))
  }
  active?.focus?.({ preventScroll: true })
  if (!ok) throw new Error("Copy failed")
}
/**
 *
 */
const useCopyFeedback = (duration = 1900) => {
  const [state, setState] = useState("idle")
  const [activeKey, setActiveKey] = useState(null)
  const timeout = useRef(null)
  const reset = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = null
    setState("idle")
    setActiveKey(null)
  }, [])
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current)
    },
    []
  )
  const copy = useCallback(
    async (value, key = "default") => {
      if (timeout.current) clearTimeout(timeout.current)
      setActiveKey(key)
      try {
        await writeClipboard(value)
        setState("copied")
        timeout.current = setTimeout(reset, duration)
        return true
      } catch {
        setState("error")
        timeout.current = setTimeout(reset, duration)
        return false
      }
    },
    [duration, reset]
  )
  return { state, activeKey, copy, reset }
}
export { useCopyFeedback, writeClipboard }
