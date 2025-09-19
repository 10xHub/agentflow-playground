/* eslint-disable */
import { MessageSquare } from "lucide-react"
import PropTypes from "prop-types"
import React, { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

// import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  // SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import {
  setThreadId,
  setThreadTitle,
  setConfig,
  setInitState,
  setStreamingResponse,
  setRecursionLimit,
  setReadonlyData,
  setResponseGranularity,
  setIncludeRaw,
} from "@/services/store/slices/threadSettings.slice"

/**
 * ThreadSettingsSheet component displays thread settings and information
 */
const ThreadSettingsSheet = ({ isOpen, onClose, threadId, threadData }) => {
  const { toast } = useToast()
  const dispatch = useDispatch()
  const threadSettings = useSelector((state) => state.threadSettingsStore)

  const [localTitle, setLocalTitle] = useState("")
  const [localThreadId, setLocalThreadId] = useState("")
  const [localConfig, setLocalConfig] = useState("")
  const [localInitState, setLocalInitState] = useState("")
  const [localStreamingResponse, setLocalStreamingResponse] = useState(false)
  const [localRecursionLimit, setLocalRecursionLimit] = useState(0)

  const [localResponseGranularity, setLocalResponseGranularity] = useState("low")
  const [localIncludeRaw, setLocalIncludeRaw] = useState(false)

  useEffect(() => {
    if (threadData) {
      dispatch(setThreadId(threadId || ""))
      dispatch(setThreadTitle(threadData.title || ""))
      dispatch(
        setReadonlyData({
          total_messages: threadData.messages?.length || 0,
          tool_token: 0,
          total_token: 0,
          total_tool_calls: 0,
          total_human_messages: 0,
          total_ai_messages: 0,
        })
      )
    }
  }, [threadData, threadId, dispatch])

  useEffect(() => {
    setLocalTitle(threadSettings.thread_title)
    setLocalThreadId(threadSettings.thread_id)
    setLocalConfig(JSON.stringify(threadSettings.config, null, 2))
    setLocalInitState(JSON.stringify(threadSettings.init_state, null, 2))
    setLocalStreamingResponse(threadSettings.streaming_response)
    setLocalRecursionLimit(threadSettings.recursion_limit)
    setLocalResponseGranularity(threadSettings.response_granularity || "low")
    setLocalIncludeRaw(Boolean(threadSettings.include_raw))
  }, [threadSettings])

  const handleFieldChange = (field, value) => {
    try {
      switch (field) {
        case "threadId":
          setLocalThreadId(value)
          dispatch(setThreadId(value))
          break
        case "title":
          setLocalTitle(value)
          dispatch(setThreadTitle(value))
          break
        case "streamingResponse":
          setLocalStreamingResponse(value)
          dispatch(setStreamingResponse(value))
          break
        case "recursionLimit": {
          const limit = parseInt(value) || 0
          setLocalRecursionLimit(limit)
          dispatch(setRecursionLimit(limit))
          break
        }
        case "config":
          setLocalConfig(value)
          try {
            const parsed = JSON.parse(value)
            dispatch(setConfig(parsed))
          } catch {
            // Invalid JSON, don't update store yet
          }
          break
        case "initState":
          setLocalInitState(value)
          try {
            const parsed = JSON.parse(value)
            dispatch(setInitState(parsed))
          } catch {
            // Invalid JSON, don't update store yet
          }
          break
        case "responseGranularity":
          setLocalResponseGranularity(value)
          dispatch(setResponseGranularity(value))
          break
        case "includeRaw":
          setLocalIncludeRaw(value)
          dispatch(setIncludeRaw(value))
          break
        default:
          break
      }
    } catch {
      toast({
        title: "Error",
        description: `Failed to update ${field}.`,
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] flex flex-col"
        data-testid="thread-settings-sheet"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Thread Details
          </SheetTitle>
          <SheetDescription>View and edit the thread details</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Context Details </Label>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p>Total Messages: {threadSettings.context_total_messages}</p>
                  <p>Total Tokens: {threadSettings.context_total_tokens}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Statistics </Label>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p>Total Token: {threadSettings.total_token}</p>
                  <p>Total Tool Calls: {threadSettings.total_tool_calls}</p>
                  <p>
                    Total Human Messages: {threadSettings.total_human_messages}
                  </p>
                  <p>Total AI Messages: {threadSettings.total_ai_messages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div>
            Modify the thread details below. <br />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Changes are saved automatically, These fields will be shared with
              invoke/stream api calls. Only use when necessary.
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="thread-id">Thread ID</Label>
            <Input
              id="thread-id"
              type="text"
              value={localThreadId}
              onChange={(event) =>
                handleFieldChange("threadId", event.target.value)
              }
              className="w-full"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Unique identifier for this thread
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thread-title">Thread Title</Label>
            <Input
              id="thread-title"
              type="text"
              value={localTitle}
              onChange={(event) =>
                handleFieldChange("title", event.target.value)
              }
              className="w-full"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Display name for this conversation thread
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="streaming-response">Streaming Response</Label>
            <input
              id="streaming-response"
              type="checkbox"
              className="ml-2"
              checked={localStreamingResponse}
              onChange={(event) =>
                handleFieldChange("streamingResponse", event.target.checked)
              }
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enable streaming response
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="response-granularity">Response Granularity</Label>
            <select
              id="response-granularity"
              className="w-full border rounded p-2 bg-background"
              value={localResponseGranularity}
              onChange={(event) =>
                handleFieldChange("responseGranularity", event.target.value)
              }
            >
              <option value="full">Full</option>
              <option value="partial">Partial</option>
              <option value="low">Low</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controls verbosity of the API response
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="include-raw">Include Raw</Label>
            <input
              id="include-raw"
              type="checkbox"
              className="ml-2"
              checked={localIncludeRaw}
              onChange={(event) =>
                handleFieldChange("includeRaw", event.target.checked)
              }
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Include raw data in responses
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recursion-limit">
              Recursion Limit{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                (Maximum recursion depth)
              </span>
            </Label>
            <Input
              id="recursion-limit"
              type="number"
              value={localRecursionLimit}
              onChange={(event) =>
                handleFieldChange("recursionLimit", event.target.value)
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Config{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                (JSON, optional, will pass with the request)
              </span>
            </Label>
            <textarea
              value={localConfig}
              onChange={(event) =>
                handleFieldChange("config", event.target.value)
              }
              className="w-full h-32 p-2 border rounded resize-none"
              placeholder="Enter JSON config"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Initial State{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                (JSON, optional, will pass with the request)
              </span>{" "}
              <br />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Only use when you want to override the main state, for example,
                you want to control which node to be executed next, or pass
                fresh data in every API call for any field of the main state.
              </span>
            </Label>
            <textarea
              value={localInitState}
              onChange={(event) =>
                handleFieldChange("initState", event.target.value)
              }
              className="w-full h-32 p-2 border rounded resize-none"
              placeholder="Enter JSON init state"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

ThreadSettingsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  threadId: PropTypes.string,
  threadData: PropTypes.object,
}

ThreadSettingsSheet.defaultProps = {
  threadId: null,
  threadData: null,
}

export default ThreadSettingsSheet
