import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * UserNav component displays a user profile avatar.
 */
const UserNav = () => {
  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button variant="outline" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="#" alt="Avatar" />
              <AvatarFallback className="bg-transparent">JD</AvatarFallback>
            </Avatar>
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  )
}

export default UserNav
