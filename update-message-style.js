const fs = require('fs');
const file = 'src/pages/chat/component/full/MessageView.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update bubble logic
content = content.replace(
  /const bubbleClassName[\s\S]*?from-blue-500 to-purple-600"/,
  `const isBotMessageFlat = !isUser && !isReasoning && !isToolCall && !isToolResult
  const bubbleClassName = isUser
    ? "bg-muted text-foreground"
    : isReasoning
      ? "bg-slate-50/50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800"
      : isToolCall
        ? "bg-amber-50/50 dark:bg-amber-950/10 text-slate-900 dark:text-slate-300 border border-amber-200/50 dark:border-amber-900/50"
        : isToolResult
          ? "bg-orange-50/50 dark:bg-orange-950/10 text-slate-900 dark:text-slate-300 border border-orange-200/50 dark:border-orange-900/50"
          : "bg-transparent text-foreground"
  const avatarClassName = isToolCall
    ? "from-amber-500 to-orange-500"
  const fs = require('fs');
const file =50const file = 'src/pages/Relet content = fs.readFileSync(file, 'utf8');

// Update bubbro
// Update bubble logic
content = content.rndecontent = content.rep c  /const bubbleClassName[\s  `const isBotMessageFlat = !isUser && !isReasoning && !isToogr  const bubbleClassName = isUser
    ? "bg-muted text-foreground"
    : isReasonin g    ? "bg-muted text-foregroundns    : isReasoning
      ? "bg-sns      ? "bg-slatan      : isToolCall
        ? "bg-amber-50/50 dark:bg-amber-950/10 text-slate-900 dark:text-slate-300 border border-amber-200/50 }`        ? "bg-ambsN        : isToolResult
          ? "bg-orange-50/50 dark:bg-orange-950/10 text-slate-900 dark:text-slate-300 border border-orange-200nd          ? "bg-orangow          : "bg-transparent text-foreground"
  const avatarClassName = isToolCall
    ? "from-amber-500 to-orange-500"
  const fs = require}`  const avatarClassName = isToolCall
    ? F
    ? "from-amber-500 to-oran git diff src/pages/chat/component/full/MessageView.jsx
 ^C
 EOF
