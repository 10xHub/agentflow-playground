import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * AddMessageSheet component provides a form to add new context messages
 * @returns {object} Sheet component with message form
 */
const AddMessageSheet = ({
  isOpen,
  onOpenChange: handleOpenChange,
  newMessage,
  onMessageChange,
  onAddMessage: handleAddMessage,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
              onChange={(event) =>
                onMessageChange({
                  ...newMessage,
                  message_id: event.target.value,
                })
              }
              placeholder="Auto-generated if empty"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={newMessage.role}
              onChange={(event) =>
                onMessageChange({
                  ...newMessage,
                  role: event.target.value,
                })
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
              onChange={(event) =>
                onMessageChange({
                  ...newMessage,
                  content: event.target.value,
                })
              }
              placeholder="Enter message content..."
              className="w-full p-3 border border-border rounded-lg bg-background text-sm min-h-[120px] resize-vertical focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleAddMessage}
              disabled={!newMessage.content.trim()}
              className="flex-1"
            >
              Add Message
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

AddMessageSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  newMessage: PropTypes.object.isRequired,
  onMessageChange: PropTypes.func.isRequired,
  onAddMessage: PropTypes.func.isRequired,
}

export default AddMessageSheet
