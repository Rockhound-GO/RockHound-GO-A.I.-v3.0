## 2024-05-05 - Missing ARIA Labels on Icon-Only Navigation Buttons
**Learning:** Across this app, navigation actions (like "Go back" or "Close" represented by `ArrowLeft` or `X` icons) are missing `aria-label` attributes, rendering them invisible or confusing to screen reader users.
**Action:** When working on navigation or icon-only controls, always verify that `aria-label` attributes are present. Future enhancements should address these consistently.
