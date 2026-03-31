const fs = require('fs');
const file = 'src/pages/chat/component/full/MessageView.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard markdown raw colors with Tailwind css variables (foreground/muted)
content = content.replace(/text-slate-900 dark:text-slate-100/g, 'text-foreground');
content = content.replace(/bg-slate-100 dark:bg-slate-800/g, 'bg-muted');
content = content.replace(/text-slate-800 dark:text-slate-200/g, 'text-foreground');
content = content.replace(/border-slate-300 dark:border-slate-600/g, 'border-border');
content = content.replace(/border-slate-200 dark:border-slate-700/g, 'border-border');
content = content.replace(/text-slate-600 dark:text-slate-400/g, 'text-muted-foreground');
content = content.replace(/bg-slate-50 dark:bg-slate-800/g, 'bg-muted/50');
content = content.replace(/text-slate-700 dark:text-slate-300/g, 'text-muted-foreground');
content = content.replace(/bg-slate-900 dark:!bg-slate-950/g, 'bg-zinc-950 dark:bg-zinc-950');
const fs = require('fs');
const)const file = 'src/pages/jsl git diff src/pages/chat/component/full/MessageView.jsx | head -n 30
 EOF
