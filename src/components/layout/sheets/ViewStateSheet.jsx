import {
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Activity,
  Database,
  RefreshCw,
} from "lucide-react"
import PropTypes from "prop-types"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import ct from "@constants/"
import { useFetchStateSchema } from "@query/state.query"

/**
 * Helper component for managing array fields
 */
const ArrayField = ({
  label,
  items = [],
  onAdd,
  onRemove,
  onUpdate,
  itemPlaceholder,
}) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <Label className="text-xs">{label}</Label>
      <Button size="sm" onClick={onAdd}>
        Add {label}
      </Button>
    </div>
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="flex gap-2">
          <Input
            value={item}
            onChange={(event) => onUpdate(index, event.target.value)}
            placeholder={itemPlaceholder}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(index)}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  </div>
)

ArrayField.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.array,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  itemPlaceholder: PropTypes.string,
}

/**
 * Helper component for context message management
 */
const ContextMessage = ({ message, index, onUpdate, onRemove }) => (
  <div className="border border-border/30 rounded-md p-3 space-y-2 bg-background/50 hover:bg-background/70 transition-all duration-200">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-medium text-muted-foreground">
          #{index + 1}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            message.role === "user"
              ? "bg-blue-100 text-blue-700"
              : message.role === "assistant"
                ? "bg-green-100 text-green-700"
                : message.role === "system"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
          }`}
        >
          {message.role}
        </span>
        <span className="text-xs text-muted-foreground">
          ID: {message.message_id || "auto"}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className="h-6 w-6 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
      >
        ×
      </Button>
    </div>

    <div className="space-y-2">
      <div className="text-sm leading-relaxed">
        {message.content?.length > 100
          ? `${message.content.slice(0, 100)}...`
          : message.content || "No content"}
      </div>

      {message.content?.length > 100 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show full content
          </summary>
          <div className="mt-2 p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </details>
      )}
    </div>
  </div>
)

ContextMessage.propTypes = {
  message: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
}

/**
 * Custom hook for form data management
 */
const useFormData = (stateData) => {
  const [formData, setFormData] = useState({
    context: [],
    context_summary: "",
    execution_meta: {
      current_node: "",
      step: 0,
      status: "idle",
      interrupted_node: [],
      interrupt_reason: "",
      interrupt_data: [],
      thread_id: "",
      internal_data: {},
    },
  })

  useEffect(() => {
    if (stateData) {
      setFormData((previousData) => ({ ...previousData, ...stateData }))
    }
  }, [stateData])

  const updateField = (path, value) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        if (!current[keys[keyIndex]]) current[keys[keyIndex]] = {}
        current = current[keys[keyIndex]]
      }
      current[keys[keys.length - 1]] = value
      return newFormData
    })
  }

  const updateNumberField = (path, value) => {
    const numberValue = parseInt(value) || 0
    updateField(path, numberValue)
  }

  const updateArrayItem = (path, itemIndex, value) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      current[arrayField][itemIndex] = value
      return newFormData
    })
  }

  const addArrayItem = (path, item = "") => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        if (!current[keys[keyIndex]]) current[keys[keyIndex]] = {}
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      if (!current[arrayField]) current[arrayField] = []
      current[arrayField].push(item)
      return newFormData
    })
  }

  const removeArrayItem = (path, itemIndex) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      current[arrayField].splice(itemIndex, 1)
      return newFormData
    })
  }

  return {
    formData,
    updateField,
    updateNumberField,
    updateArrayItem,
    addArrayItem,
    removeArrayItem,
  }
}

/**
 * ViewStateSheet component displays application state information
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {Function} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying application state
 */
// eslint-disable-next-line max-lines-per-function, complexity
const ViewStateSheet = ({ isOpen, onClose }) => {
  const stateData = useSelector((state) => state[ct.store.STATE_STORE].state)
  const {
    data: stateSchema,
    isLoading: isSchemaLoading,
    error: schemaError,
  } = useFetchStateSchema()
  const [isExecutionMetaOpen, setIsExecutionMetaOpen] = useState(false)
  const [isAddMessageOpen, setIsAddMessageOpen] = useState(false)
  const [newMessage, setNewMessage] = useState({
    message_id: "",
    role: "user",
    content: "",
  })

  const {
    formData,
    updateField,
    updateArrayItem,
    addArrayItem,
    removeArrayItem,
  } = useFormData(stateData)

  const handleContextUpdate = (messageIndex, newMessage) => {
    updateArrayItem("context", messageIndex, newMessage)
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

  // Get dynamic fields from schema instead of formData keys
  const getDynamicFields = () => {
    // The schema data structure is: stateSchema.data.data.properties
    const schemaProperties = stateSchema?.data?.data?.properties

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

    if (!stateSchema?.data?.data?.properties?.[fieldKey]) {
      return {
        title: fieldKey,
        description: defaultDescription,
        type: "string",
      }
    }

    const fieldSchema = stateSchema.data.data.properties[fieldKey]
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
                <Card className="p-2">
                  <div className="flex w-full justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-foreground">
                          Context Messages ({(formData.context || []).length})
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Conversation history: Short Term Memory
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddMessageOpen(true)}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border-0"
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {(formData.context || []).map((message, messageIndex) => (
                      <ContextMessage
                        key={`message-${message.message_id || messageIndex}`}
                        message={message}
                        index={messageIndex}
                        onUpdate={(newMessage) =>
                          handleContextUpdate(messageIndex, newMessage)
                        }
                        onRemove={() =>
                          removeArrayItem("context", messageIndex)
                        }
                      />
                    ))}
                    {(formData.context || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          No messages yet. Click &quot;Add&quot; to start.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Context Summary Field */}
                <Card className="p-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label
                        htmlFor="context_summary"
                        className="text-sm font-semibold text-foreground"
                      >
                        Context Summary
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conversation Summary: If you are using summary version
                      </p>
                    </div>
                  </div>
                  <textarea
                    id="context_summary"
                    value={formData.context_summary || ""}
                    onChange={(event) =>
                      updateField("context_summary", event.target.value)
                    }
                    placeholder="Enter context summary..."
                    className="w-full p-2 text-xs resize-vertical border border-border/50 rounded-lg bg-background/50"
                  />
                </Card>

                {/* Execution Metadata - Collapsible */}
                <Card className="p-2">
                  <Collapsible
                    open={isExecutionMetaOpen}
                    onOpenChange={setIsExecutionMetaOpen}
                  >
                    <CollapsibleTrigger className="flex w-full justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <Activity className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-foreground">
                            Execution Metadata
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Current execution state and processing information
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-muted"
                      >
                        {isExecutionMetaOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4">
                        {/* Current Node - Editable */}
                        <div>
                          <Label htmlFor="current_node" className="text-xs">
                            Current Node
                          </Label>
                          <Input
                            id="current_node"
                            value={formData.execution_meta?.current_node || ""}
                            onChange={(event) =>
                              updateField(
                                "execution_meta.current_node",
                                event.target.value
                              )
                            }
                            placeholder="Current node"
                            className="w-full mt-1"
                          />
                        </div>

                        {/* Read-only fields */}
                        <div className="grid gap-3">
                          <div>
                            <Label htmlFor="status" className="text-xs">
                              Status (Read-only)
                            </Label>
                            <Input
                              id="status"
                              value={formData.execution_meta?.status || ""}
                              disabled
                              placeholder="Status"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="step" className="text-xs">
                              Step (Read-only)
                            </Label>
                            <Input
                              id="step"
                              type="number"
                              value={formData.execution_meta?.step || 0}
                              disabled
                              placeholder="Step number"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="thread_id" className="text-xs">
                              Thread ID (Read-only)
                            </Label>
                            <Input
                              id="thread_id"
                              value={formData.execution_meta?.thread_id || ""}
                              disabled
                              placeholder="Thread ID"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="interrupt_reason"
                              className="text-xs"
                            >
                              Interrupt Reason (Read-only)
                            </Label>
                            <textarea
                              id="interrupt_reason"
                              value={
                                formData.execution_meta?.interrupt_reason || ""
                              }
                              disabled
                              placeholder="Interrupt reason"
                              className="w-full mt-1 p-2 border rounded-md bg-muted text-sm min-h-[60px] resize-vertical opacity-60"
                              rows={3}
                            />
                          </div>
                        </div>

                        {/* Array fields - Read-only */}
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs font-medium">
                              Interrupted Nodes (Read-only)
                            </Label>
                            <div className="space-y-1 mt-2">
                              {(
                                formData.execution_meta?.interrupted_node || []
                              ).map((node, nodeIndex) => (
                                <Input
                                  key={`interrupted-${nodeIndex}`}
                                  value={node}
                                  disabled
                                  className="bg-muted opacity-60"
                                />
                              ))}
                              {(formData.execution_meta?.interrupted_node || [])
                                .length === 0 && (
                                <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted">
                                  No interrupted nodes
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium">
                              Interrupt Data (Read-only)
                            </Label>
                            <div className="space-y-1 mt-2">
                              {(
                                formData.execution_meta?.interrupt_data || []
                              ).map((data, dataIndex) => (
                                <textarea
                                  key={`interrupt-data-${dataIndex}`}
                                  value={data}
                                  disabled
                                  className="w-full p-2 border rounded-md bg-muted text-sm min-h-[40px] resize-vertical opacity-60"
                                  rows={2}
                                />
                              ))}
                              {(formData.execution_meta?.interrupt_data || [])
                                .length === 0 && (
                                <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted">
                                  No interrupt data
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Dynamic Additional Fields */}
                {isSchemaLoading && (
                  <Card className="p-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-500/10 rounded-lg">
                        <Database className="h-4 w-4 text-gray-600 animate-pulse" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-foreground">
                          Loading Schema...
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fetching dynamic field definitions
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {schemaError && (
                  <Card className="p-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Database className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-foreground text-red-700">
                          Schema Loading Error
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1 text-red-600">
                          Failed to load dynamic field definitions
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {!isSchemaLoading &&
                  !schemaError &&
                  dynamicFields.map((fieldKey) => {
                    const fieldInfo = getFieldInfo(fieldKey)
                    return (
                      <Card key={fieldKey} className="p-2">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Database className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-foreground">
                              {fieldInfo.title}
                            </Label>
                          </div>
                        </div>
                        <textarea
                          value={
                            typeof formData[fieldKey] === "string"
                              ? formData[fieldKey]
                              : JSON.stringify(
                                  formData[fieldKey] || fieldInfo.default || ""
                                )
                          }
                          onChange={(event) => {
                            try {
                              const value =
                                event.target.value.startsWith("{") ||
                                event.target.value.startsWith("[")
                                  ? JSON.parse(event.target.value)
                                  : event.target.value
                              updateField(fieldKey, value)
                            } catch {
                              updateField(fieldKey, event.target.value)
                            }
                          }}
                          placeholder={`Enter ${fieldInfo.title.toLowerCase()}...`}
                          className="w-full p-2 text-xs resize-vertical border border-border/50 rounded-lg bg-background/50"
                        />
                      </Card>
                    )
                  })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Message Sheet */}
      <Sheet open={isAddMessageOpen} onOpenChange={setIsAddMessageOpen}>
        <SheetContent side="right" className="w-[500px]">
          <SheetHeader>
            <SheetTitle>Add New Message</SheetTitle>
            <SheetDescription>
              Create a new message for the conversation context
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="message_id">Message ID (Optional)</Label>
              <Input
                id="message_id"
                value={newMessage.message_id}
                onChange={(e) =>
                  setNewMessage((previous) => ({
                    ...previous,
                    message_id: e.target.value,
                  }))
                }
                placeholder="Auto-generated if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={newMessage.role}
                onChange={(e) =>
                  setNewMessage((previous) => ({
                    ...previous,
                    role: e.target.value,
                  }))
                }
                className="w-full p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              >
                <option value="user">User</option>
                <option value="assistant">Assistant</option>
                <option value="tool">Tool</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                value={newMessage.content}
                onChange={(e) =>
                  setNewMessage((previous) => ({
                    ...previous,
                    content: e.target.value,
                  }))
                }
                placeholder="Enter message content..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm min-h-[120px] resize-vertical focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddMessage}
                disabled={!newMessage.content.trim()}
                className="flex-1"
              >
                Add Message
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddMessageOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

ViewStateSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ViewStateSheet
