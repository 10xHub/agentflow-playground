Framework: Reactjs
Language: Javascript
UI Framework: shadcn + Tailwind CSS
API: Axios + TanStack Query

Folder Structure
src 
- component -> all ui component
- hooks -> all custom hooks
- lib -> constants, context, layout, devtools library
- pages -> all page components
- routes -> all route components
- service
    - api - all api related files
    - mock - all mock related files
    - query - tanstack query related files
    - store - all redux related files

API consume directly in ui then use this flow?
Axios + TanStack Query -> UI

But if not directly consumed then use this flow?
axios + redux, async thunk

