## 2026-05-14 - Keyboard Accessibility on Interactive Divs
**Learning:** Found custom `div` elements handling `onClick` events for navigation (like the User Profile button) without keyboard or screen reader support. It's crucial that any interactive non-button element acting as a button includes `role="button"`, `tabIndex={0}`, `onKeyDown` handlers (Enter/Space), and visible focus states (`focus-visible`).
**Action:** Always verify that elements acting as buttons have full semantic, keyboard, and focus accessibility matching native `<button>` elements.
