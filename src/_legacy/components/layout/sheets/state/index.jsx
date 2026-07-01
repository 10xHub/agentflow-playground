import { RefreshCw, Save } from "lucide-react"
import PropTypes from "prop-types"
import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import {
  fetchThreadState,
  updateThreadState,
} from "@/services/store/slices/state.slice"
import ct from "@constants/"

import AddMessageSheet from "./add-message-sheet"
import ContextMessagesSection from "./context-messages-section"
import ContextSummarySection from "./context-summary-section"
import DynamicFieldsSection from "./dynamic-fields-section"
import ExecutionMetadataSection from "./execution-metadata-section"
import useFormData from "./useFormData"

const NO_ACTIVE_THREAD_TITLE = "No Active Thread"
const NO_ACTIVE_THREAD_DESC = "Please select or create a thread first"
const STATIC_FIELDS = ["context", "context_summary", "execution_meta", "state"]
const DEFAULT_FIELD_DESCRIPTION = "Additional state data field"

export const getSchemaFields = (stateSchema = {}, stateData = {}) => {
  const dynamicFields = [
    ...new Set([...Object.keys(stateSchema), ...Object.keys(stateData)]),
  ].filter((key) => !STATIC_FIELDS.includes(key))

  const getFieldInfo = (fieldKey) => {
    const fieldSchema = stateSchema[fieldKey]
    if (!fieldSchema) {
      return {
        title: fieldKey,
        description: DEFAULT_FIELD_DESCRIPTION,
        type: "string",
      }
    }
    return {
      title: fieldSchema.title || fieldKey,
      description: fieldSchema.description || DEFAULT_FIELD_DESCRIPTION,
      type: fieldSchema.type || "string",
      default: fieldSchema.default,
    }
  }
  return { dynamicFields, getFieldInfo }
}

const buildStatePayload = (formData = {}) => {
  const stateToSave = {
    context: formData.context || [],
    context_summary: formData.context_summary || "",
    execution_meta: formData.execution_meta || {},
  }

  Object.keys(formData).forEach((key) => {
    if (!STATIC_FIELDS.includes(key)) {
      stateToSave[key] = formData[key]
    }
  })

  return stateToSave
}

const areValuesEqual = (leftValue, rightValue) =>
  JSON.stringify(leftValue ?? null) === JSON.stringify(rightValue ?? null)

const buildStatePatch = (currentState = {}, nextState = {}) => {
  const patch = {}
  const keys = new Set([
    ...Object.keys(currentState || {}),
    ...Object.keys(nextState || {}),
  ])

  keys.forEach((key) => {
    if (key === "state") {
      return
    }

    if (!areValuesEqual(currentState?.[key], nextState?.[key])) {
      patch[key] = nextState[key]
    }
  })

  return patch
}

const useStateActions = (
  activeThreadId,
  stateData,
  formData,
  dispatch,
  toast
) => {
  const handleSyncState = async () => {
    if (!activeThreadId) {
      toast({
        title: NO_ACTIVE_THREAD_TITLE,
        description: NO_ACTIVE_THREAD_DESC,
        variant: "destructive",
      })
      return
    }
    try {
      await dispatch(fetchThreadState(activeThreadId)).unwrap()
      toast({
        title: "State Synced",
        description: "Successfully fetched latest state from server",
      })
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error || "Failed to sync state from server",
        variant: "destructive",
      })
    }
  }

  const handleSaveState = async () => {
    if (!activeThreadId) {
      toast({
        title: NO_ACTIVE_THREAD_TITLE,
        description: NO_ACTIVE_THREAD_DESC,
        variant: "destructive",
      })
      return
    }
    try {
      const nextState = buildStatePayload(formData)
      const statePatch = buildStatePatch(stateData, nextState)

      if (Object.keys(statePatch).length === 0) {
        toast({
          title: "No Changes",
          description: "State is already up to date",
        })
        return
      }

      await dispatch(
        updateThreadState({
          threadId: activeThreadId,
          state: statePatch,
          config: {},
        })
      ).unwrap()
      await dispatch(fetchThreadState(activeThreadId)).unwrap()
      toast({
        title: "State Saved",
        description: "Successfully updated state on server",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error || "Failed to save state to server",
        variant: "destructive",
      })
    }
  }

  return { handleSyncState, handleSaveState }
}

const StateSheetHeader = ({
  isLoading,
  isSaving,
  activeThreadId,
  onSync,
  onSave,
}) => {
  const handleSync = onSync
  const handleSave = onSave
  return (
    <SheetHeader className="px-5 pt-4 pb-3 border-b flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <SheetTitle className="text-sm font-semibold">
            Application State
          </SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            Thread context &amp; memory
          </SheetDescription>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            disabled={isLoading || !activeThreadId}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            disabled={isSaving || !activeThreadId}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </SheetHeader>
  )
}

StateSheetHeader.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  activeThreadId: PropTypes.string,
  onSync: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

StateSheetHeader.defaultProps = {
  activeThreadId: null,
}

/**
 * ViewStateSheet component displays application state information
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {() => void} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying application state
 */
const EMPTY_NEW_MESSAGE = { message_id: "", role: "user", content: "" }

const useAddMessageActions = (
  addArrayItem,
  newMessage,
  setNewMessage,
  setIsAddMessageOpen
) => {
  const handleAddMessageOpenChange = (open) => {
    if (!open) setNewMessage(EMPTY_NEW_MESSAGE)
    setIsAddMessageOpen(open)
  }
  const handleAddMessage = () => {
    if (newMessage.content.trim()) {
      addArrayItem("context", {
        message_id: newMessage.message_id || Date.now(),
        content: newMessage.content.trim(),
        role: newMessage.role,
      })
      setNewMessage(EMPTY_NEW_MESSAGE)
      handleAddMessageOpenChange(false)
    }
  }
  return { handleAddMessageOpenChange, handleAddMessage }
}

const ViewStateSheet = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const stateData = useSelector((state) => state[ct.store.STATE_STORE].state)
  const stateSchema = useSelector((state) => state[ct.store.STATE_STORE].schema)
  const isLoading = useSelector(
    (state) => state[ct.store.STATE_STORE].isLoading
  )
  const isSaving = useSelector((state) => state[ct.store.STATE_STORE].isSaving)
  const activeThreadId = useSelector(
    (state) => state[ct.store.CHAT_STORE].activeThreadId
  )

  const [isExecutionMetaOpen, setIsExecutionMetaOpen] = useState(false)
  const [isAddMessageOpen, setIsAddMessageOpen] = useState(false)
  const [newMessage, setNewMessage] = useState(EMPTY_NEW_MESSAGE)

  const { formData, updateField, addArrayItem, removeArrayItem } = useFormData(
    stateData,
    stateSchema
  )
  const { dynamicFields, getFieldInfo } = getSchemaFields(
    stateSchema,
    stateData
  )
  const { handleSyncState, handleSaveState } = useStateActions(
    activeThreadId,
    stateData,
    formData,
    dispatch,
    toast
  )

  useEffect(() => {
    if (isOpen && activeThreadId) {
      dispatch(fetchThreadState(activeThreadId))
    }
  }, [isOpen, activeThreadId, dispatch])

  const { handleAddMessageOpenChange, handleAddMessage } = useAddMessageActions(
    addArrayItem,
    newMessage,
    setNewMessage,
    setIsAddMessageOpen
  )
  const handleExecutionMetaOpenChange = setIsExecutionMetaOpen
  const handleUpdateField = updateField
  const handleMessageChange = setNewMessage

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="rightLarge" className="flex flex-col p-0 gap-0">
          <StateSheetHeader
            isLoading={isLoading}
            isSaving={isSaving}
            activeThreadId={activeThreadId}
            onSync={handleSyncState}
            onSave={handleSaveState}
          />
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <ContextMessagesSection
                  context={formData.context}
                  handleAddMessage={() => setIsAddMessageOpen(true)}
                  onRemoveMessage={(messageIndex) =>
                    removeArrayItem("context", messageIndex)
                  }
                />
                <ContextSummarySection
                  contextSummary={formData.context_summary}
                  onUpdateSummary={(value) =>
                    updateField("context_summary", value)
                  }
                />
                <ExecutionMetadataSection
                  isOpen={isExecutionMetaOpen}
                  onOpenChange={handleExecutionMetaOpenChange}
                  executionMeta={formData.execution_meta}
                  onUpdateField={handleUpdateField}
                />
                <DynamicFieldsSection
                  dynamicFields={dynamicFields}
                  getFieldInfo={getFieldInfo}
                  formData={formData}
                  onUpdateField={handleUpdateField}
                />
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
      <AddMessageSheet
        isOpen={isAddMessageOpen}
        onOpenChange={handleAddMessageOpenChange}
        newMessage={newMessage}
        onMessageChange={handleMessageChange}
        onAddMessage={handleAddMessage}
      />
    </>
  )
}

ViewStateSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ViewStateSheet
