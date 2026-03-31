import { ChevronLeft } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SidebarToggle = ({ isOpen, setIsOpen }) => {
  return (
    <div className="invisible lg:visible absolute top-[12px] -right-[16px] z-20 bg-white dark:bg-primary-foreground">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md w-8 h-8"
        variant="outline"
        size="icon"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform ease-in-out duration-700",
            isOpen === false ? "rotate-180" : "rotate-0"
          )}
        />
      </Button>
    </div>
  )
}

export default SidebarToggle

SidebarToggle.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
}
