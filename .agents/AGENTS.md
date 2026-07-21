## Verification Rule
Always run the dev server (npm run dev) and test modified components/pages using browser_subagent (or by asking the user to manually test) before declaring them 'done'. Do not rely solely on code inspection or npm run build output, as runtime ReferenceErrors (like undefined variables) might not be caught by the build process.

## Responsive Design Rules
1. **Compact Stat Cards (No Huge 1-Column Cards)**: On mobile screens (< 768px), stat card rows MUST NOT stack into huge 1-column full-width blocks. Always render them as a compact 2x2 grid (`repeat(2, 1fr)`) with tight padding (10px 12px) and small fonts.
2. **Zero Horizontal Table Scrolling**: Never force horizontal scroll on tables in mobile view. Table rows MUST adapt into clean, mobile-first card items (using CSS grid-template-areas or mobile cards) that fit 100% within the screen width.
