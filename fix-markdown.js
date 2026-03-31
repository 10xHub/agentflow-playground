import fs from "node:fs"

const filePath = "src/pages/chat/component/full/MessageView.jsx"

const replacements = [
  [/text-slate-900 dark:text-slate-100/g, "text-foreground"],
  [/bg-slate-100 dark:bg-slate-800/g, "bg-muted"],
  [/text-slate-800 dark:text-slate-200/g, "text-foreground"],
  [/border-slate-300 dark:border-slate-600/g, "border-border"],
  [/border-slate-200 dark:border-slate-700/g, "border-border"],
  [/text-slate-600 dark:text-slate-400/g, "text-muted-foreground"],
  [/bg-slate-50 dark:bg-slate-800/g, "bg-muted/50"],
  [/text-slate-700 dark:text-slate-300/g, "text-muted-foreground"],
  [/bg-slate-900 dark:!bg-slate-950/g, "bg-zinc-950 dark:bg-zinc-950"],
]

let content = fs.readFileSync(filePath, "utf8")

for (const [pattern, replacement] of replacements) {
  content = content.replace(pattern, replacement)
}

fs.writeFileSync(filePath, content)
