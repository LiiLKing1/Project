
## Verification Rule
Always run the dev server (
pm run dev) and test modified components/pages using rowser_subagent (or by asking the user to manually test) before declaring them 'done'. Do not rely solely on code inspection or 
pm run build output, as runtime ReferenceErrors (like undefined variables) might not be caught by the build process.
