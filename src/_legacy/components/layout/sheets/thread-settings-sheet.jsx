import {
  MessageSquare,
  Sparkles,
  Activity,
  Wrench,
  Brain,
  Radio,
  ChevronDown,
} from "lucide-react"
import PropTypes from "prop-types"
import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  setConfig,
  setIncludeRaw,
  setInitState,
  setReadonlyData,
  setRecursionLimit,
  setResponseGranularity,
  setShowToolMessageContent,
  setStreamingResponse,
  setThreadId,
  setThreadTitle,
} from "@/services/store/slices/thread-settings.slice"

const MESSAGE_KIND = {
  USER: "user",
  ASSISTANT: "assistant",
  REASONING: "reasoning",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
}

const EMPTY_OBJECT_TEXT = "{\n  \n}"

const countWords = (value) => {
  const normalized = String(value || "").trim()

  if (!normalized) {
    return 0
  }

  return normalized.split(/\s+/).length
}

const estimateTokens = (messages = []) => {
  const totalWords = messages.reduce((accumulator, message) => {
    return (
      accumulator + countWords(message?.content || message?.rawContent || "")
    )
  }, 0)

  return Math.ceil((totalWords / 750) * 1000)
}

const getObjectKeyCount = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0
  }

  return Object.keys(value).length
}

const DATE_NOT_AVAILABLE = "Not available"

const formatDateTime = (value) => {
  if (!value) {
    return DATE_NOT_AVAILABLE
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return DATE_NOT_AVAILABLE
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const stringifyJson = (value) => {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return EMPTY_OBJECT_TEXT
  }
}

const summarizeThread = (threadData, threadSettings) => {
  const messages = Array.isArray(threadData?.messages)
    ? threadData.messages
    : []
  const totalMessages = messages.length
  const estimatedTokens = estimateTokens(messages)
  const userMessages = messages.filter(
    (message) => message?.kind === MESSAGE_KIND.USER || message?.role === "user"
  ).length
  const assistantMessages = messages.filter(
    (message) =>
      message?.kind === MESSAGE_KIND.ASSISTANT ||
      (message?.role === "assistant" && !message?.kind)
  ).length
  const reasoningMessages = messages.filter(
    (message) => message?.kind === MESSAGE_KIND.REASONING
  ).length
  const toolCalls = messages.filter(
    (message) => message?.kind === MESSAGE_KIND.TOOL_CALL
  ).length
  const toolResults = messages.filter(
    (message) => message?.kind === MESSAGE_KIND.TOOL_RESULT
  ).length

  return {
    contextMessages: threadSettings.context_total_messages || totalMessages,
    contextTokens: threadSettings.context_total_tokens || estimatedTokens,
    totalMessages,
    totalTokens: estimatedTokens,
    userMessages,
    assistantMessages,
    reasoningMessages,
    toolCalls,
    toolResults,
    configKeys: getObjectKeyCount(threadSettings.config),
    initStateKeys: getObjectKeyCount(threadSettings.init_state),
    createdAt: formatDateTime(threadData?.createdAt),
    updatedAt: formatDateTime(threadData?.updatedAt),
  }
}

const StatCard = ({ label, value, tone = "default", icon: Icon }) => (
  <div
    className={`rounded-xl border px-3 py-3 ${
      tone === "accent"
        ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {Icon && <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
    </div>
    <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
      {value}
    </div>
  </div>
)

const ToggleField = ({ id, label, description, checked, onChange }) => (
  <label
    htmlFor={id}
    aria-label={label}
    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950"
  >
    <div className="space-y-1">
      <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
        {label}
      </div>
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
    <input
      id={id}
      type="checkbox"
      className="mt-1 h-4 w-4 rounded border-slate-300 bg-transparent text-slate-950 focus:ring-2 dark:border-slate-700 dark:text-slate-50"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
)

const JsonEditor = ({
  id,
  title,
  description,
  value,
  error,
  onChange,
  placeholder,
}) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label htmlFor={id}>{title}</Label>
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
    <Textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-40 resize-y font-mono text-sm"
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
    />
    {error ? (
      <p className="text-sm text-red-500">{error}</p>
    ) : (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Saved automatically when the JSON is valid.
      </p>
    )}
  </div>
)

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(["default", "accent"]),
  icon: PropTypes.elementType,
}

StatCard.defaultProps = {
  tone: "default",
  icon: null,
}

ToggleField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
}

JsonEditor.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
}

JsonEditor.defaultProps = {
  error: "",
}

const ThreadMetadataPanel = ({ overview, threadSettings }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      Thread Metadata
    </p>
    <div className="mt-2.5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
      <div className="space-y-1">
        <p className="font-medium text-slate-950 dark:text-slate-50">
          Thread ID
        </p>
        <p className="break-all text-xs">
          {threadSettings.thread_id || "Auto-generated"}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="font-medium text-slate-950 dark:text-slate-50">
            Created
          </p>
          <p className="text-xs">{overview.createdAt}</p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-950 dark:text-slate-50">
            Updated
          </p>
          <p className="text-xs">{overview.updatedAt}</p>
        </div>
      </div>
    </div>
  </div>
)

ThreadMetadataPanel.propTypes = {
  overview: PropTypes.object.isRequired,
  threadSettings: PropTypes.object.isRequired,
}

const MessageBreakdownPanel = ({ overview }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      Message Breakdown
    </p>
    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          User {overview.userMessages}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          Assistant {overview.assistantMessages}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          Tool Results {overview.toolResults}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          Total Rows {overview.totalMessages}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          Config Keys {overview.configKeys}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-xs text-slate-950 dark:text-slate-50">
          Init State Keys {overview.initStateKeys}
        </p>
      </div>
    </div>
  </div>
)

MessageBreakdownPanel.propTypes = {
  overview: PropTypes.object.isRequired,
}

const ThreadOverviewCard = ({ overview, threadSettings }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card className="rounded-2xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="space-y-2 pb-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">Overview</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <Radio className="h-3 w-3" />
                    {threadSettings.streaming_response
                      ? "Streaming on"
                      : "Streaming off"}
                  </Badge>
                  <Badge variant="outline">
                    <Sparkles className="h-3 w-3" />
                    {threadSettings.response_granularity}
                  </Badge>
                  {threadSettings.include_raw && (
                    <Badge variant="outline">Raw enabled</Badge>
                  )}
                </div>
                <CardDescription className="text-sm leading-6">
                  Compact thread summary for the current conversation.
                </CardDescription>
              </div>
              <ChevronDown
                className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                label="Messages"
                value={overview.contextMessages}
                tone="accent"
                icon={MessageSquare}
              />
              <StatCard
                label="Tokens"
                value={overview.contextTokens}
                tone="accent"
                icon={Activity}
              />
              <StatCard
                label="Tool Calls"
                value={overview.toolCalls}
                icon={Wrench}
              />
              <StatCard
                label="Reasoning"
                value={overview.reasoningMessages}
                icon={Brain}
              />
            </div>
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 lg:grid-cols-2">
              <ThreadMetadataPanel
                overview={overview}
                threadSettings={threadSettings}
              />
              <MessageBreakdownPanel overview={overview} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

ThreadOverviewCard.propTypes = {
  overview: PropTypes.object.isRequired,
  threadSettings: PropTypes.object.isRequired,
}

const RequestSettingsHeader = () => (
  <div className="space-y-2">
    <h3 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
      Request Settings
    </h3>
    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
      These values are shared with invoke and stream calls for the active
      thread. Changes are applied immediately.
    </p>
  </div>
)

const ThreadRequestSettings = ({ threadSettings, onFieldChange }) => {
  const handleFieldChange = onFieldChange
  return (
    <>
      <RequestSettingsHeader />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="thread-id">Thread ID</Label>
          <Input
            id="thread-id"
            type="text"
            value={threadSettings.thread_id || ""}
            onChange={(event) =>
              handleFieldChange("threadId", event.target.value)
            }
            placeholder="Leave empty for auto-generation"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unique identifier for this thread.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="thread-title">Thread Title</Label>
          <Input
            id="thread-title"
            type="text"
            value={threadSettings.thread_title || ""}
            onChange={(event) => handleFieldChange("title", event.target.value)}
            placeholder="Enter thread title"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Friendly name shown in the conversations list.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="response-granularity">Response Granularity</Label>
          <select
            id="response-granularity"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={threadSettings.response_granularity || "low"}
            onChange={(event) =>
              handleFieldChange("responseGranularity", event.target.value)
            }
          >
            <option value="full">Full</option>
            <option value="partial">Partial</option>
            <option value="low">Low</option>
          </select>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controls how much structured detail the API returns.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recursion-limit">Recursion Limit</Label>
          <Input
            id="recursion-limit"
            type="number"
            min="1"
            value={threadSettings.recursion_limit}
            onChange={(event) =>
              handleFieldChange("recursionLimit", event.target.value)
            }
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Maximum recursion depth used during invoke and stream flows.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <ToggleField
          id="streaming-response"
          label="Streaming Response"
          description="Enable token-by-token responses for this thread."
          checked={threadSettings.streaming_response}
          onChange={(v) => handleFieldChange("streamingResponse", v)}
        />
        <ToggleField
          id="show-tool-message-content"
          label="Show Tool Messages"
          description="Show or hide tool call and tool result messages in the conversation view."
          checked={threadSettings.show_tool_message_content}
          onChange={(v) => handleFieldChange("showToolMessageContent", v)}
        />
        <ToggleField
          id="include-raw"
          label="Include Raw Response Data"
          description="Keep raw payloads alongside normalized response data for debugging."
          checked={threadSettings.include_raw}
          onChange={(v) => handleFieldChange("includeRaw", v)}
        />
      </div>
    </>
  )
}

ThreadRequestSettings.propTypes = {
  threadSettings: PropTypes.object.isRequired,
  onFieldChange: PropTypes.func.isRequired,
}
const useThreadDataSync = (threadId, threadData, dispatch) => {
  useEffect(() => {
    if (threadId) {
      dispatch(setThreadId(threadId))
    }

    if (!threadData) {
      return
    }

    const resolvedTitle = threadData.title || threadData.thread_name || ""

    if (resolvedTitle) {
      dispatch(setThreadTitle(resolvedTitle))
    }

    const messages = Array.isArray(threadData.messages)
      ? threadData.messages
      : []
    const totalTokens = estimateTokens(messages)
    const userMessages = messages.filter(
      (message) =>
        message?.kind === MESSAGE_KIND.USER || message?.role === "user"
    ).length
    const assistantMessages = messages.filter(
      (message) => message?.kind === MESSAGE_KIND.ASSISTANT
    ).length
    const toolCalls = messages.filter(
      (message) => message?.kind === MESSAGE_KIND.TOOL_CALL
    ).length

    dispatch(
      setReadonlyData({
        total_messages: messages.length,
        total_tokens: totalTokens,
        total_tool_calls: toolCalls,
        total_human_messages: userMessages,
        total_ai_messages: assistantMessages,
      })
    )
  }, [threadData, threadId, dispatch])
}

const useJsonEditors = (threadSettings, dispatch) => {
  const [localConfig, setLocalConfig] = useState(() =>
    stringifyJson(threadSettings.config)
  )
  const [localInitState, setLocalInitState] = useState(() =>
    stringifyJson(threadSettings.init_state)
  )
  const [configError, setConfigError] = useState("")
  const [initStateError, setInitStateError] = useState("")
  const [previousConfig, setPreviousConfig] = useState(threadSettings.config)
  const [previousInitState, setPreviousInitState] = useState(
    threadSettings.init_state
  )

  if (previousConfig !== threadSettings.config) {
    setPreviousConfig(threadSettings.config)
    setLocalConfig(stringifyJson(threadSettings.config))
    setConfigError("")
  }
  if (previousInitState !== threadSettings.init_state) {
    setPreviousInitState(threadSettings.init_state)
    setLocalInitState(stringifyJson(threadSettings.init_state))
    setInitStateError("")
  }

  const handleJsonChange = (field, value) => {
    const trimmed = value.trim()
    if (field === "config") {
      setLocalConfig(value)
    } else {
      setLocalInitState(value)
    }
    if (!trimmed) {
      if (field === "config") {
        setConfigError("")
        dispatch(setConfig({}))
      } else {
        setInitStateError("")
        dispatch(setInitState({}))
      }
      return
    }
    try {
      const parsed = JSON.parse(value)
      if (field === "config") {
        setConfigError("")
        dispatch(setConfig(parsed))
      } else {
        setInitStateError("")
        dispatch(setInitState(parsed))
      }
    } catch {
      const message =
        "Invalid JSON. Changes will be saved once the JSON is valid."
      if (field === "config") {
        setConfigError(message)
      } else {
        setInitStateError(message)
      }
    }
  }

  return {
    localConfig,
    localInitState,
    configError,
    initStateError,
    handleJsonChange,
  }
}

const createFieldHandler = (dispatch, toast) => (field, value) => {
  try {
    switch (field) {
      case "threadId":
        dispatch(setThreadId(value))
        break
      case "title":
        dispatch(setThreadTitle(value))
        break
      case "streamingResponse":
        dispatch(setStreamingResponse(value))
        break
      case "showToolMessageContent":
        dispatch(setShowToolMessageContent(value))
        break
      case "recursionLimit":
        dispatch(setRecursionLimit(Math.max(1, parseInt(value, 10) || 1)))
        break
      case "responseGranularity":
        dispatch(setResponseGranularity(value))
        break
      case "includeRaw":
        dispatch(setIncludeRaw(value))
        break
      default:
        break
    }
  } catch {
    toast({
      title: "Update failed",
      description: `Could not update ${field}.`,
      variant: "destructive",
    })
  }
}

const ThreadSettingsSheet = ({ isOpen, onClose, threadId, threadData }) => {
  const { toast } = useToast()
  const dispatch = useDispatch()
  const threadSettings = useSelector((state) => state.threadSettingsStore)

  const {
    localConfig,
    localInitState,
    configError,
    initStateError,
    handleJsonChange,
  } = useJsonEditors(threadSettings, dispatch)

  useThreadDataSync(threadId, threadData, dispatch)

  const overview = useMemo(
    () => summarizeThread(threadData, threadSettings),
    [threadData, threadSettings]
  )

  const handleFieldChange = useMemo(
    () => createFieldHandler(dispatch, toast),
    [dispatch, toast]
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="rightLarge"
        className="flex flex-col h-full"
        data-testid="thread-settings-sheet"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Thread Details
          </SheetTitle>
          <SheetDescription>
            Review the current thread overview and tune the request-level thread
            settings.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 pb-6">
          <div className="space-y-6">
            <ThreadOverviewCard
              overview={overview}
              threadSettings={threadSettings}
            />
            <ThreadRequestSettings
              threadSettings={threadSettings}
              onFieldChange={handleFieldChange}
            />
            <Separator />
            <JsonEditor
              id="thread-config"
              title="Config"
              description="Optional JSON config merged into the request config for this thread."
              value={localConfig}
              error={configError}
              onChange={(value) => handleJsonChange("config", value)}
              placeholder='{\n  "mode": "safe"\n}'
            />
            <JsonEditor
              id="thread-init-state"
              title="Initial State"
              description="Optional JSON payload merged into initial_state for invoke and stream calls."
              value={localInitState}
              error={initStateError}
              onChange={(value) => handleJsonChange("initState", value)}
              placeholder='{\n  "draft": {\n    "enabled": true\n  }\n}'
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

ThreadSettingsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  threadId: PropTypes.string,
  threadData: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    thread_name: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    messages: PropTypes.array,
  }),
}

ThreadSettingsSheet.defaultProps = {
  threadId: null,
  threadData: null,
}

export default ThreadSettingsSheet
