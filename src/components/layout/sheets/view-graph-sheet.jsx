import PropTypes from "prop-types"
import { useSelector } from "react-redux"

import ReFlowComponent from "@/components/graph/react-flow-component"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import ct from "@constants"

/**
 * ViewGraphSheet component displays the network graph visualization.
 * Reads graph data directly from Redux store.
 * @returns {object} Sheet component displaying network graph
 */
const ViewGraphSheet = ({ isOpen, onClose }) => {
  // Read graph data directly from Redux store
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])

  const { graphData } = store

  // Fallback to static data if no API data is available
  const defaultGraphData = {
    info: {
      node_count: 0,
      edge_count: 0,
      checkpointer: false,
      checkpointer_type: "",
      publisher: false,
      store: false,
      interrupt_before: [],
      interrupt_after: [],
      context_type: "none",
      id_generator: "",
      id_type: "",
      state_type: "",
      state_field: [],
    },
    nodes: [],
    edges: [],
  }

  const displayData = graphData || defaultGraphData

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle>Network Graph</SheetTitle>
          <SheetDescription>
            Visualize application flow and network connections
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-6 min-h-0 flex-1 pr-4">
          <div className="min-h-full pb-6">
            <ReFlowComponent
              graphData={displayData}
              graphInfo={displayData.info || {}}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

ViewGraphSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ViewGraphSheet
