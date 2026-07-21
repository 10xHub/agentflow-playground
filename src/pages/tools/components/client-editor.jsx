import { Check, Play, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch } from "react-redux"

import { track } from "@/lib/analytics"
import {
  registerClientTools,
  removeClientTool,
  upsertClientTool,
} from "@/store/tools-slice"

import { schemaFromParams as schemaFromParameters } from "../normalize"
import styles from "../tools.module.css"

const LANGS = ["JavaScript", "TypeScript"]
const ACCENT_VAR = "var(--accent)"
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

// Seed the parameters editor from the stored JSON schema, falling back to one
// derived from the flattened param list.
const initialParameters = (tool) =>
  JSON.stringify(
    tool.parameters && Object.keys(tool.parameters.properties || {}).length
      ? tool.parameters
      : schemaFromParameters(tool.params || []),
    null,
    2
  )

// Name + badges row, with the delete affordance for persisted tools.
/**
 *
 */
const EditorHeader = ({
  name = "",
  registered = false,
  toolId = null,
  onDelete,
}) => (
  <div className={styles.dTop}>
    <div>
      <div className={styles.dName}>{name || "new_client_tool"}</div>
      <div className={styles.dBadges}>
        <span className={`${styles.nb} ${styles.client}`}>
          <span className={styles.tdot} style={{ background: ACCENT_VAR }} />
          client · browser
        </span>
        {registered ? (
          <span className={`${styles.nb} ${styles.registered}`}>
            ● registered
          </span>
        ) : (
          <span className={styles.nb}>unregistered</span>
        )}
      </div>
    </div>
    {toolId && (
      <button className={styles.delBtn} type="button" onClick={onDelete}>
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
    )}
  </div>
)

EditorHeader.propTypes = {
  name: PropTypes.string,
  registered: PropTypes.bool,
  toolId: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
}

// Mock vs handler switch plus the mock payload editor.
/**
 *
 */
const CallModeField = ({ callMode, onCallModeChange, mock, onMockChange }) => (
  <div className={styles.fld}>
    <label className={styles.whenLabel} htmlFor="ct-mock">
      When the agent calls this tool
      <span className={styles.modeSeg}>
        <button
          className={callMode === "mock" ? styles.on : ""}
          onClick={() => onCallModeChange("mock")}
          type="button"
        >
          Return mock
        </button>
        <button
          className={callMode === "handler" ? styles.on : ""}
          onClick={() => onCallModeChange("handler")}
          type="button"
        >
          Run handler
        </button>
      </span>
    </label>
    <textarea
      id="ct-mock"
      className={styles.code}
      rows={3}
      spellCheck={false}
      value={mock}
      onChange={(e) => onMockChange(e.target.value)}
      disabled={callMode === "handler"}
      style={callMode === "handler" ? { opacity: 0.5 } : undefined}
    />
    <div className={`${styles.editorNote} ${styles.mockNote}`}>
      {callMode === "mock"
        ? "Mock is returned as the tool_result — no real browser API is called. Switch to “Run handler” to execute the function above."
        : "Handler runs the function above in the browser and returns its result as the tool_result."}
    </div>
  </div>
)

CallModeField.propTypes = {
  callMode: PropTypes.string.isRequired,
  onCallModeChange: PropTypes.func.isRequired,
  mock: PropTypes.string.isRequired,
  onMockChange: PropTypes.func.isRequired,
}

// Register / save row plus the inline result message.
/**
 *
 */
const EditorActions = ({
  busy = false,
  registered = false,
  message = null,
  onRegister,
  onSave,
}) => (
  <div className={styles.editorActions}>
    <button
      className={styles.regBtn}
      onClick={onRegister}
      type="button"
      disabled={busy}
    >
      <Check size={14} strokeWidth={1.9} />
      {busy
        ? "Registering…"
        : registered
          ? "Update registration"
          : "Register tool"}
    </button>
    <button className={styles.testBtn} type="button" onClick={onSave}>
      <Play size={14} strokeWidth={1.8} />
      Save draft
    </button>
    {message && (
      <span
        className={styles.editorNote}
        style={{
          color: message.type === "error" ? "var(--danger)" : ACCENT_VAR,
        }}
      >
        {message.text}
      </span>
    )}
  </div>
)

EditorActions.propTypes = {
  busy: PropTypes.bool,
  registered: PropTypes.bool,
  message: PropTypes.shape({
    type: PropTypes.string,
    text: PropTypes.string,
  }),
  onRegister: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

// Editable detail for browser-owned (client) tools. Register persists to the
// store + registers with the SDK and pushes to the server via setup().
/**
 *
 */
const ClientEditor = ({ tool }) => {
  const dispatch = useDispatch()

  const [name, setName] = useState(tool.name || "")
  const [desc, setDesc] = useState(tool.desc || "")
  const [code, setCode] = useState(tool.code || DEFAULT_CODE)
  const [parameters_, setParameters] = useState(() => initialParameters(tool))
  const [mock, setMock] = useState(tool.mock || DEFAULT_MOCK)
  const [lang, setLang] = useState("JavaScript")
  const [callMode, setCallMode] = useState(tool.callMode || "mock")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const persist = () => {
    let parameters
    try {
      parameters = JSON.parse(parameters_)
    } catch {
      setMessage({ type: "error", text: "Parameters must be valid JSON." })
      return null
    }
    if (!name.trim()) {
      setMessage({ type: "error", text: "Tool name is required." })
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
    setMessage(null)
    try {
      await dispatch(registerClientTools({ only: record.id }))
      // Only successful registrations count. Tool name and code are never sent.
      track("client_tool_registered")
      setMessage({ type: "ok", text: "Registered with the agent." })
    } catch (e) {
      setMessage({ type: "error", text: e?.message || "Registration failed." })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = () => {
    if (tool.id) dispatch(removeClientTool(tool.id))
  }

  return (
    <>
      <EditorHeader
        name={name}
        registered={tool.registered}
        toolId={tool.id}
        onDelete={handleDelete}
      />
      <div className={styles.dDesc}>
        Define a browser-owned tool. It is registered into the client SDK and,
        when the agent calls it, the playground resolves the remote_tool_call
        with your handler / mock response.
      </div>

      <div className={styles.fld}>
        <label htmlFor="ct-name">Tool name</label>
        <input
          id="ct-name"
          className={styles.inp}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="get_location"
          spellCheck={false}
        />
      </div>

      <div className={styles.fld}>
        <label htmlFor="ct-desc">
          Description <span className={styles.hint}>— shown to the model</span>
        </label>
        <input
          id="ct-desc"
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
        <label htmlFor="ct-params">
          Parameters{" "}
          <span className={styles.hint}>— JSON schema (sent to the model)</span>
        </label>
        <textarea
          id="ct-params"
          className={styles.code}
          rows={4}
          spellCheck={false}
          value={parameters_}
          onChange={(e) => setParameters(e.target.value)}
        />
      </div>

      <CallModeField
        callMode={callMode}
        onCallModeChange={setCallMode}
        mock={mock}
        onMockChange={setMock}
      />

      <EditorActions
        busy={busy}
        registered={tool.registered}
        message={message}
        onRegister={handleRegister}
        onSave={persist}
      />
    </>
  )
}

ClientEditor.propTypes = {
  tool: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    desc: PropTypes.string,
    code: PropTypes.string,
    mock: PropTypes.string,
    callMode: PropTypes.string,
    registered: PropTypes.bool,
    params: PropTypes.array,
    parameters: PropTypes.object,
  }).isRequired,
}

export default ClientEditor
