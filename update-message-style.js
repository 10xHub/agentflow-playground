import fs from "node:fs"

const filePath = "src/pages/chat/component/full/MessageView.jsx"
const content = fs.readFileSync(filePath, "utf8")

if (!content.includes("const bubbleClassName")) {
    throw new Error("MessageView.jsx no longer contains the expected bubble class block")
}

fs.writeFileSync(filePath, content)