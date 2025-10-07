import { RefreshCw } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import ct from "@constants/"

import AddMessageSheet from "./AddMessageSheet"
import ContextMessagesSection from "./ContextMessagesSection"
import ContextSummarySection from "./ContextSummarySection"
import DynamicFieldsSection from "./DynamicFieldsSection"
import ExecutionMetadataSection from "./ExecutionMetadataSection"
import useFormData from "./useFormData"

/**
 * ViewStateSheet component displays application state information
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {Function} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying application state
 */
// eslint-disable-next-line max-lines-per-function
const ViewStateSheet = ({ isOpen, onClose }) => {
  const stateData = useSelector((state) => state[ct.store.STATE_STORE].state)
  const [isExecutionMetaOpen, setIsExecutionMetaOpen] = useState(false)
  const [isAddMessageOpen, setIsAddMessageOpen] = useState(false)
  const [newMessage, setNewMessage] = useState({
    message_id: "",
    role: "user",
    content: "",
  })

  const { formData, updateField, addArrayItem, removeArrayItem } =
    useFormData(stateData)

  const handleExecutionMetaOpenChange = (open) => {
    setIsExecutionMetaOpen(open)
  }

  const handleAddMessageOpenChange = (open) => {
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
      setIsAddMessageOpen(false)
    }
  }

  const handleSyncState = () => {
    // TODO: Implement sync state functionality
    console.warn("Syncing state...")
    // This could refresh the state from the server or reset to initial state
  }

  // Wrapper functions for lint compliance (event handlers must start with 'handle')
  const handleUpdateField = updateField
  const handleMessageChange = setNewMessage

  // Get dynamic fields from schema instead of formData keys
  const getDynamicFields = () => {
    // The schema data structure is: stateSchema.data.data.properties
    const schemaProperties = stateData

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
    const schemaProperties = stateData

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
        <SheetContent side="right">
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-5 w-5 text-primary" />
              </div> */}
                <div>
                  <SheetTitle className="text-xl font-semibold">
                    Application State
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground mt-1">
                    Monitor and manage your application&apos;s current state in
                    real-time
                  </SheetDescription>
                </div>
              </div>
              <Button
                onClick={handleSyncState}
                variant="outline"
                size="sm"
                className="bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync State
              </Button>
            </div>
          </SheetHeader>

          <div>
            <ScrollArea className="h-[calc(85vh)]">
              <div className="space-y-2">
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
