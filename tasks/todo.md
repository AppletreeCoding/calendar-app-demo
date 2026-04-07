# Calendar App — Build Plan

## Stack
Plain HTML + CSS + Vanilla JS (single `index.html`, no build step, no dependencies).

---

## Tasks

### 1. Project scaffold
- [x] Create `index.html` with document structure, viewport meta, and linked `style.css` / `app.js`
- [x] Create `style.css` with CSS reset and CSS custom properties (color palette, spacing)
- [x] Create `app.js` with module skeleton (state object, init function)

**Acceptance criteria:**
- Opening `index.html` in a browser shows a blank page with no console errors.
- `style.css` and `app.js` load successfully (Network tab shows 200).

---

### 2. Month grid rendering
- [x] Implement `renderCalendar(year, month)` — builds a 6-row × 7-col grid
- [x] Add month/year header with Previous / Next navigation buttons
- [x] Shade days outside the current month (greyed out)
- [x] Highlight today's date

**Acceptance criteria:**
- Correct day-of-week alignment for any month (Jan 2026 starts on Thursday, etc.).
- Clicking Previous / Next updates the header and grid.
- Today is visually distinct (ring or background highlight).
- Days outside the current month are visually muted.

---

### 3. LocalStorage persistence layer
- [x] Implement `loadEvents()` — reads `calendarEvents` key from localStorage, returns parsed array (or `[]`)
- [x] Implement `saveEvents(events)` — serializes array to JSON and writes to localStorage
- [x] Expose a single `state.events` array used throughout the app

**Acceptance criteria:**
- After adding an event and refreshing the page, the event reappears.
- Corrupt / missing localStorage key is handled gracefully (falls back to `[]`).

---

### 4. Event display on grid
- [x] After rendering the grid, attach event dots/chips to matching day cells
- [x] Clip overflow: show max 3 events per cell + "+N more" indicator when exceeded

**Acceptance criteria:**
- Events saved in localStorage appear on the correct day cells.
- Cells with > 3 events show "+N more" instead of overflowing.

---

### 5. Add-event modal
- [x] Create modal HTML (`<dialog>` element) with fields: Title, Date, Start time, End time, Notes
- [x] Open modal when user clicks a day cell (pre-fill the date field)
- [x] "Save" button calls `addEvent()` and closes modal
- [x] "Cancel" button closes modal without saving
- [x] Clicking the backdrop closes modal without saving

**Acceptance criteria:**
- Modal opens with the clicked date pre-filled.
- Pressing Escape or clicking outside dismisses the modal.
- Saving appends the event to `state.events` and re-renders the grid.

---

### 6. Edit & delete events
- [x] Clicking an event chip opens the modal in edit mode (fields pre-filled)
- [x] "Update" button calls `updateEvent(id)` and re-renders
- [x] "Delete" button (red, with confirmation) calls `deleteEvent(id)` and re-renders
- [x] Modal title changes to "Edit Event" vs "Add Event"

**Acceptance criteria:**
- Editing an event updates it in place (same `id`).
- Deleting an event removes it from localStorage and the grid immediately.
- Delete requires a confirmation step (inline confirm — second click).

---

### 7. Basic validation
- [x] Show inline error if Title is empty on Save/Update
- [x] Show inline error if End time is before Start time (when both are set)
- [x] Prevent saving while validation errors are present

**Acceptance criteria:**
- Attempting to save with an empty title shows an error message inside the modal (no `alert()`).
- End-before-start triggers a clear error message.
- No event is written to localStorage while errors exist.

---

### 8. Responsive layout (US locale)
- [x] Day-of-week header: Sun → Sat (US week start)
- [x] CSS grid adapts to mobile: smaller cells, truncated event text, touch-friendly tap targets (≥ 44 px)
- [x] Modal is full-screen on small viewports (< 480 px)

**Acceptance criteria:**
- Layout is usable on 375 px wide viewport (iPhone SE).
- Day headers show abbreviated names (Sun, Mon, … Sat).
- No horizontal scrollbar on any viewport ≥ 320 px.

---

## Review

### What was built
Three files — `index.html`, `style.css`, `app.js` — no dependencies, no build step.

| Area | Implementation notes |
|------|----------------------|
| Grid | Fixed 6×7 (42 cells) with `firstDay` offset for any month. Overflow cells are muted and non-clickable. |
| Persistence | `loadEvents` / `saveEvents` with try/catch around `JSON.parse`; falls back to `[]`. Key: `calendarEvents`. |
| Events on grid | `buildEventMap` groups events by `dateStr`; max 3 chips shown, rest collapsed to "+N more". |
| Modal | Native `<dialog>` with `showModal()` / `close()`. Backdrop click detected via `e.target === modal`. |
| Edit / Delete | Single modal handles both modes. Delete uses a two-click inline confirm (button text changes to "Confirm delete?"). |
| Validation | Inline `<span>` error messages; `.error` CSS class on inputs; no `alert()`. |
| Responsive | `@media (max-width: 600px)` shrinks cells and slides modal up as a bottom sheet. Sun–Sat US week order throughout. |

### Follow-up items (not in scope)
- Recurring events
- Drag-to-reschedule
- Week / day view toggle
- Color coding per event
- Export to `.ics`
