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

/**
 * ViewStateSheet component displays application state information
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {() => void} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying application state
 */
// eslint-disable-next-line max-lines-per-function
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
  const [newMessage, setNewMessage] = useState({
    message_id: "",
    role: "user",
    content: "",
  })
  const noActiveThreadTitle = "No Active Thread"
  const noActiveThreadDescription = "Please select or create a thread first"

  const { formData, updateField, addArrayItem, removeArrayItem } = useFormData(
    stateData,
    stateSchema
  )

  // Fetch thread state when sheet opens and there's an active thread
  useEffect(() => {
    if (isOpen && activeThreadId) {
      dispatch(fetchThreadState(activeThreadId))
    }
  }, [isOpen, activeThreadId, dispatch])

  const handleExecutionMetaOpenChange = (open) => {
    setIsExecutionMetaOpen(open)
  }

  const handleAddMessageOpenChange = (open) => {
    if (!open) {
      setNewMessage({
        message_id: "",
        role: "user",
        content: "",
      })
    }

    setIsAddMessageOpen(open)
  }

  const handleAddMessage = () => {
    if (newMessage.content.trim()) {
      addArrayItem("context", {
        message_id: newMessage.message_id || Date.now(),
        content: newMessage.content.trim(),
        role: newMessage.role,
      })
      setNewMessage({
        message_id: "",
        role: "user",
        content: "",
      })
      handleAddMessageOpenChange(false)
    }
  }

  const handleSyncState = async () => {
    if (!activeThreadId) {
      toast({
        title: noActiveThreadTitle,
        description: noActiveThreadDescription,
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
        title: noActiveThreadTitle,
        description: noActiveThreadDescription,
        variant: "destructive",
      })
      return
    }

    try {
      // Prepare state data to send to server
      const stateToSave = {
        context: formData.context || [],
        context_summary: formData.context_summary || "",
        execution_meta: formData.execution_meta || {},
      }

      // Add dynamic fields
      const staticFields = ["context", "context_summary", "execution_meta"]
      Object.keys(formData).forEach((key) => {
        if (!staticFields.includes(key)) {
          stateToSave[key] = formData[key]
        }
      })

      await dispatch(
        updateThreadState({
          threadId: activeThreadId,
          state: stateToSave,
          config: {},
        })
      ).unwrap()

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

  // Wrapper functions for lint compliance (event handlers must start with 'handle')
  const handleUpdateField = updateField
  const handleMessageChange = setNewMessage

  // Get dynamic fields from schema instead of formData keys
  const getDynamicFields = () => {
    const schemaProperties = stateSchema

    if (!schemaProperties) return []

    const staticFields = ["context", "context_summary", "execution_meta"]

    return Object.keys(schemaProperties).filter(
      (key) => !staticFields.includes(key)
    )
  }

  const dynamicFields = getDynamicFields()

  // Get field info from schema
  const getFieldInfo = (fieldKey) => {
    const defaultDescription = "Additional state data field"
    const schemaProperties = stateSchema

    if (!schemaProperties?.[fieldKey]) {
      return {
        title: fieldKey,
        description: defaultDescription,
        type: "string",
      }
    }

    const fieldSchema = schemaProperties[fieldKey]
    return {
      title: fieldSchema.title || fieldKey,
      description: fieldSchema.description || defaultDescription,
      type: fieldSchema.type || "string",
      default: fieldSchema.default,
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 gap-0 w-[440px] sm:w-[480px]"
        >
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
                  onClick={handleSyncState}
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
                  onClick={handleSaveState}
                  size="sm"
                  disabled={isSaving || !activeThreadId}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {/* Context Messages Array */}
                <ContextMessagesSection
                  context={formData.context}
                  handleAddMessage={() => setIsAddMessageOpen(true)}
                  onRemoveMessage={(messageIndex) =>
                    removeArrayItem("context", messageIndex)
                  }
                />

                {/* Context Summary Field */}
                <ContextSummarySection
                  contextSummary={formData.context_summary}
                  onUpdateSummary={(value) =>
                    updateField("context_summary", value)
                  }
                />

                {/* Execution Metadata - Collapsible */}
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

      {/* Add Message Sheet */}
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
