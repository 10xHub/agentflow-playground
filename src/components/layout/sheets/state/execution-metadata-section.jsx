import { ChevronDown, ChevronUp, Activity } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * ExecutionMetadataSection component displays execution metadata in a collapsible card
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the collapsible section is open
 * @param {Function} props.onOpenChange - Function to handle open state changes
 * @param {object} props.executionMeta - The execution metadata object
 * @param {Function} props.handleUpdateField - Function to handle field updates
 * @returns {object} Collapsible card component with execution metadata
 */
// eslint-disable-next-line max-lines-per-function
const ExecutionMetadataSection = ({
  isOpen,
  onOpenChange,
  executionMeta,
  handleUpdateField,
}) => {
  return (
    <Card className="p-2">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
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
          <Button variant="ghost" size="sm" className="hover:bg-muted">
            {isOpen ? (
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
                value={executionMeta?.current_node || ""}
                onChange={(event) =>
                  handleUpdateField(
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
                  value={executionMeta?.status || ""}
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
                  value={executionMeta?.step || 0}
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
                  value={executionMeta?.thread_id || ""}
                  disabled
                  placeholder="Thread ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="interrupt_reason" className="text-xs">
                  Interrupt Reason (Read-only)
                </Label>
                <textarea
                  id="interrupt_reason"
                  value={executionMeta?.interrupt_reason || ""}
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
                  {(executionMeta?.interrupted_node || []).map(
                    (node, _nodeIndex) => (
                      <Input
                        key={`interrupted-${node}`}
                        value={node}
                        disabled
                        className="bg-muted opacity-60"
                      />
                    )
                  )}
                  {(executionMeta?.interrupted_node || []).length === 0 && (
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
                  {(executionMeta?.interrupt_data || []).map(
                    (data, _dataIndex) => (
                      <textarea
                        key={`interrupt-data-${data}`}
                        value={data}
                        disabled
                        className="w-full p-2 border rounded-md bg-muted text-sm min-h-[40px] resize-vertical opacity-60"
                        rows={2}
                      />
                    )
                  )}
                  {(executionMeta?.interrupt_data || []).length === 0 && (
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
  )
}

ExecutionMetadataSection.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  executionMeta: PropTypes.object,
  handleUpdateField: PropTypes.func.isRequired,
}

ExecutionMetadataSection.defaultProps = {
  executionMeta: {},
}

export default ExecutionMetadataSection
