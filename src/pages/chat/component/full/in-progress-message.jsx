import PropTypes from "prop-types"

import { Spinner } from "@/components/ui/spinner"

/**
 * In-progress message component for tool calls
 */
const InProgressMessage = ({ toolCalls }) => {
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
        <Spinner className="w-4 h-4" />
      </div>
      <div className="flex flex-col max-w-[80%]">
        <div className="rounded-2xl px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2">
            <Spinner className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">
              {toolCalls.length > 0
                ? `Running ${toolCalls.length} tool${toolCalls.length > 1 ? "s" : ""}...`
                : "AI is thinking..."}
            </span>
          </div>

          {toolCalls.length > 0 && (
            <div className="mt-3 space-y-1">
              {toolCalls.map((call) => (
                <div
                  key={call.name}
                  className="text-xs bg-muted/50 p-2 rounded"
                >
                  <span className="font-medium">{call.name}</span>
                  {call.description && (
                    <span className="text-muted-foreground ml-2">
                      {call.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

InProgressMessage.propTypes = {
  toolCalls: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
}

InProgressMessage.defaultProps = {
  toolCalls: [],
}

export default InProgressMessage
