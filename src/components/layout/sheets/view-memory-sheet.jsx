import PropTypes from "prop-types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * ViewMemorySheet component displays memory usage information
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the sheet is open
 * @param {Function} props.onClose - Function to close the sheet
 * @returns {object} Sheet component displaying memory usage information
 */
const ViewMemorySheet = ({ isOpen, onClose }) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Memory Usage</SheetTitle>
          <SheetDescription>
            Monitor application memory usage and performance
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg dark:border-slate-700">
              <h3 className="font-medium mb-2">Heap Memory</h3>
              <div className="text-sm space-y-1">
                <div>Used: 45.2 MB</div>
                <div>Total: 128 MB</div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: "35%" }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg dark:border-slate-700">
              <h3 className="font-medium mb-2">Component Count</h3>
              <div className="text-sm">Active Components: 12</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

ViewMemorySheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ViewMemorySheet
