import { Check, Play, Trash2 } from "lucide-react"
import { useState } from "react"
import { useDispatch } from "react-redux"

import {
  registerClientTools,
  removeClientTool,
  upsertClientTool,
} from "@/store/toolsSlice"

import { schemaFromParams } from "../normalize"
import styles from "../tools.module.css"

const LANGS = ["JavaScript", "TypeScript"]
const DEFAULT_CODE = `async function my_tool(args) {
  // return a mock for quick testing
  return { ok: true };
}`
const DEFAULT_MOCK = `{
  "ok": true
}`

// A stable-ish id without extra deps (Date.now is unavailable in workflows only;
// here in the browser it's fine).
const makeId = () => `ct_${Math.random().toString(36).slice(2, 10)}`

// Editable detail for browser-owned (client) tools. Register persists to the
// store + registers with the SDK and pushes to the server via setup().
export default function ClientEditor({ tool }) {
  const dispatch = useDispatch()

  const [name, setName] = useState(tool.name || "")
  const [desc, setDesc] = useState(tool.desc || "")
  const [code, setCode] = useState(tool.code || DEFAULT_CODE)
  const [params, setParams] = useState(
    JSON.stringify(
      tool.parameters && Object.keys(tool.parameters.properties || {}).length
        ? tool.parameters
        : schemaFromParams(tool.params || []),
      null,
      2
    )
  )
  const [mock, setMock] = useState(tool.mock || DEFAULT_MOCK)
  const [lang, setLang] = useState("JavaScript")
  const [callMode, setCallMode] = useState(tool.callMode || "mock")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const persist = () => {
    let parameters
    try {
      parameters = JSON.parse(params)
    } catch {
      setMsg({ type: "error", text: "Parameters must be valid JSON." })
      return null
    }
    if (!name.trim()) {
      setMsg({ type: "error", text: "Tool name is required." })
      return null
    }
    const record = {
      id: tool.id || makeId(),
      name: name.trim(),
      description: desc,
      code,
      mock,
      callMode,
      parameters,
      registered: tool.registered || false,
    }
    dispatch(upsertClientTool(record))
    return record
  }

  const handleRegister = async () => {
    const record = persist()
    if (!record) return
    setBusy(true)
    setMsg(null)
    try {
      await dispatch(registerClientTools({ only: record.id }))
      setMsg({ type: "ok", text: "Registered with the agent." })
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Registration failed." })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = () => {
    if (tool.id) dispatch(removeClientTool(tool.id))
  }

  return (
    <>
      <div className={styles.dTop}>
        <div>
          <div className={styles.dName}>{name || "new_client_tool"}</div>
          <div className={styles.dBadges}>
            <span className={`${styles.nb} ${styles.client}`}>
              <span
                className={styles.tdot}
                style={{ background: "var(--accent)" }}
              />
              client · browser
            </span>
            {tool.registered ? (
              <span className={`${styles.nb} ${styles.registered}`}>
                ● registered
              </span>
            ) : (
              <span className={styles.nb}>unregistered</span>
            )}
          </div>
        </div>
        {tool.id && (
          <button
            className={styles.delBtn}
            type="button"
            onClick={handleDelete}
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>
      <div className={styles.dDesc}>
        Define a browser-owned tool. It is registered into the client SDK and,
        when the agent calls it, the playground resolves the remote_tool_call
        with your handler / mock response.
      </div>

      <div className={styles.fld}>
        <label>Tool name</label>
        <input
          className={styles.inp}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="get_location"
          spellCheck={false}
        />
      </div>

      <div className={styles.fld}>
        <label>
          Description <span className={styles.hint}>— shown to the model</span>
        </label>
        <input
          className={styles.inp}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What the tool does"
          spellCheck={false}
        />
      </div>

      <div className={styles.fld}>
        <div className={styles.codeHead}>
          <div className={styles.langTabs}>
            {LANGS.map((l) => (
              <button
                key={l}
                className={lang === l ? styles.on : ""}
                onClick={() => setLang(l)}
                type="button"
              >
                {l}
              </button>
            ))}
          </div>
          <span className={styles.rh}>
            <span className={styles.d} />
            runs in browser via registerTool()
          </span>
        </div>
        <textarea
          className={styles.code}
          rows={7}
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <div className={styles.fld}>
        <label>
          Parameters{" "}
          <span className={styles.hint}>— JSON schema (sent to the model)</span>
        </label>
        <textarea
          className={styles.code}
          rows={4}
          spellCheck={false}
          value={params}
          onChange={(e) => setParams(e.target.value)}
        />
      </div>

      <div className={styles.fld}>
        <label className={styles.whenLabel}>
          When the agent calls this tool
          <span className={styles.modeSeg}>
            <button
              className={callMode === "mock" ? styles.on : ""}
              onClick={() => setCallMode("mock")}
              type="button"
            >
              Return mock
            </button>
            <button
              className={callMode === "handler" ? styles.on : ""}
              onClick={() => setCallMode("handler")}
              type="button"
            >
              Run handler
            </button>
          </span>
        </label>
        <textarea
          className={styles.code}
          rows={3}
          spellCheck={false}
          value={mock}
          onChange={(e) => setMock(e.target.value)}
          disabled={callMode === "handler"}
          style={callMode === "handler" ? { opacity: 0.5 } : undefined}
        />
        <div className={`${styles.editorNote} ${styles.mockNote}`}>
          {callMode === "mock"
            ? "Mock is returned as the tool_result — no real browser API is called. Switch to “Run handler” to execute the function above."
            : "Handler runs the function above in the browser and returns its result as the tool_result."}
        </div>
      </div>

      <div className={styles.editorActions}>
        <button
          className={styles.regBtn}
          onClick={handleRegister}
          type="button"
          disabled={busy}
        >
          <Check size={14} strokeWidth={1.9} />
          {busy
            ? "Registering…"
            : tool.registered
              ? "Update registration"
              : "Register tool"}
        </button>
        <button className={styles.testBtn} type="button" onClick={persist}>
          <Play size={14} strokeWidth={1.8} />
          Save draft
        </button>
        {msg && (
          <span
            className={styles.editorNote}
            style={{
              color: msg.type === "error" ? "var(--danger)" : "var(--accent)",
            }}
          >
            {msg.text}
          </span>
        )}
      </div>
    </>
  )
}
