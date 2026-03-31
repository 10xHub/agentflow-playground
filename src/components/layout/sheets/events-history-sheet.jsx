import PropTypes from "prop-types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * EventsHistorySheet component displays application events history
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {Function} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying events history
 */
const EventsHistorySheet = ({ isOpen, onClose }) => {
  const mockEvents = [
    { time: "10:30:15", event: "User logged in", type: "auth" },
    { time: "10:30:22", event: "Theme changed to dark", type: "ui" },
    { time: "10:30:45", event: "Sheet opened: View State", type: "action" },
    { time: "10:31:02", event: "API call: /api/users", type: "network" },
  ]

  const getEventTypeStyles = (type) => {
    switch (type) {
      case "auth":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "ui":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "action":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Events History</SheetTitle>
          <SheetDescription>
            Track application events and user interactions
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <div className="space-y-2">
            {mockEvents.map((item) => (
              <div
                key={`${item.time}-${item.event}`}
                className="p-3 border rounded-lg dark:border-slate-700 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{item.event}</span>
                  <span className="text-slate-500">{item.time}</span>
                </div>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getEventTypeStyles(
                    item.type
                  )}`}
                >
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

EventsHistorySheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default EventsHistorySheet
