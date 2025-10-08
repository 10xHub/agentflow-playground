import { Send, Paperclip } from "lucide-react"
import PropTypes from "prop-types"

import { ShineBorder } from "@/components/magicui/shine-border"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const EmptyInputCard = ({
  onHandleSubmit,
  message,
  setMessage,
  onHandleFileChange,
  fileInputReference,
}) => {
  const handleSubmit = onHandleSubmit
  const handleFileChange = onHandleFileChange
  // file attach is handled via the hidden input label
  return (
    <div className="w-full h-full flex items-center justify-center px-2">
      <Card className="relative w-full max-w-xl mx-auto bg-gradient-to-br from-[#181c2a] via-[#23263a] to-[#1a1d2b] shadow-2xl rounded-2xl border border-[rgba(255,255,255,0.08)]">
        <ShineBorder
          shineColor={["#60A5FA", "#8B5CF6", "#F59E0B"]}
          borderWidth={1}
          duration={8}
          className="rounded-2xl"
        />
        <form onSubmit={handleSubmit} className="h-full">
          <CardContent className="p-2 flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message here to start a new chat..."
              className="w-full min-h-[120px] max-h-[28vh] px-4 py-3 bg-[#181c2a] border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground text-base leading-relaxed transition-all"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmit(event)
                }
              }}
            />
            <div className="flex items-center justify-between pt-1 border-t border-border bg-transparent">
              <label className="cursor-pointer pl-2 rounded-md hover:bg-blue-950/30 transition flex items-center gap-2">
                <input
                  ref={fileInputReference}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Paperclip className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Attach</span>
              </label>
              <Button
                type="submit"
                size="md"
                disabled={!message.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow transition-colors flex items-center gap-2 text-base font-semibold"
              >
                <Send className="w-5 h-5" />
                Send
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

EmptyInputCard.propTypes = {
  onHandleSubmit: PropTypes.func.isRequired,
  message: PropTypes.string,
  setMessage: PropTypes.func.isRequired,
  onHandleFileChange: PropTypes.func,
  // ref can be a callback or an object created by useRef
  fileInputReference: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
}

EmptyInputCard.defaultProps = {
  message: "",
  onHandleFileChange: undefined,
  fileInputReference: null,
}

export default EmptyInputCard
