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
  disabled = false,
}) => {
  const handleSubmit = onHandleSubmit
  const handleFileChange = onHandleFileChange
  // file attach is handled via the hidden input label
  return (
    <div className="w-full h-full flex items-center justify-center px-2">
      <Card className="relative w-full max-w-xl mx-auto shadow-xl rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm">
        <ShineBorder
          shineColor={["#60A5FA", "#8B5CF6", "#F59E0B"]}
          borderWidth={1}
          duration={8}
          className="rounded-2xl pointer-events-none"
        />
        <form onSubmit={handleSubmit} className="relative z-10 h-full">
          <CardContent className="p-2 flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                disabled
                  ? "Backend URL not verified. Configure in Settings to start chatting..."
                  : "Type your message here to start a new chat..."
              }
              disabled={disabled}
              className="w-full bg-background min-h-[120px] max-h-[28vh] px-4 py-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground text-base leading-relaxed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !disabled) {
                  event.preventDefault()
                  handleSubmit(event)
                }
              }}
            />
            <div className="flex items-center justify-between pt-1 border-t border-border bg-transparent">
              <label
                className={`pl-2 rounded-md transition flex items-center gap-2 ${
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-blue-950/30"
                }`}
              >
                <input
                  ref={fileInputReference}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={handleFileChange}
                  disabled={disabled}
                  className="hidden"
                />
                <Paperclip className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Attach</span>
              </label>
              <Button
                type="submit"
                size="md"
                disabled={!message.trim() || disabled}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow transition-colors flex items-center gap-2 text-base font-semibold disabled:opacity-50"
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
  disabled: PropTypes.bool,
}

EmptyInputCard.defaultProps = {
  message: "",
  onHandleFileChange: undefined,
  fileInputReference: null,
  disabled: false,
}

export default EmptyInputCard
