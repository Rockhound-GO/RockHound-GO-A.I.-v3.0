## 2025-02-28 - Missing ARIA Labels on Custom Interaction Buttons
**Learning:** Highly interactive or visually complex buttons (e.g., hold-to-scan interactions or toggles with dynamic styling) without explicit text labels are often overlooked for accessibility attributes.
**Action:** Always mandate a11y checks (like ensuring `aria-label` is present) for any custom interaction element, particularly icon-only or multi-state buttons, regardless of how complex the visual presentation or interaction logic is.
