import { MessageSquare } from "lucide-react"
import PropTypes from "prop-types"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

/**
 * ContextSummarySection component displays the context summary field
 * @param {object} props - Component props
 * @param {string} props.contextSummary - The context summary value
 * @param {Function} props.onUpdateSummary - Function to handle summary updates
 * @returns {object} Card component with context summary textarea
 */
const ContextSummarySection = ({ contextSummary, onUpdateSummary }) => {
  return (
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
        value={contextSummary || ""}
        onChange={(event) => onUpdateSummary(event.target.value)}
        placeholder="Enter context summary..."
        className="w-full p-2 text-xs resize-vertical border border-border/50 rounded-lg bg-background/50"
      />
    </Card>
  )
}

ContextSummarySection.propTypes = {
  contextSummary: PropTypes.string,
  onUpdateSummary: PropTypes.func.isRequired,
}

ContextSummarySection.defaultProps = {
  contextSummary: "",
}

export default ContextSummarySection
