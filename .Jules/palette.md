## 2024-05-10 - ARIA Labels for Icon Buttons
**Learning:** Icon-only buttons lack inherent descriptions, making them inaccessible to screen readers. In a futuristic UI with many icon-only actions (like the Beaker, Cpu, and ScanLine buttons), missing aria-labels significantly degrade the experience for visually impaired users.
**Action:** Always add descriptive `aria-label` attributes to icon-only buttons, and ensure custom button components (like draggable div elements acting as buttons) have `role="button"`, `tabIndex={0}`, and keyboard event handlers.
