# Layout, tokens and themes

Starter file: `assets/starter/index.css` (the whole stylesheet, about 540 lines).

## Fit to window

On desktop the page itself never scrolls. Each page marks one region with the class `fill`; that region takes the height that is left and scrolls inside itself. Toolbars, tabs, pagers and submit bars stay in view.

```css
@media (min-width: 1101px) and (min-height: 600px) {
  .content { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  .page { flex: 1; min-height: 0; width: 100%; }
  .page > * { flex: none; }
  .page > .fill { flex: 1; min-height: 0; }
}
```

What `fill` means on each kind of page:

| Page | The `fill` region | What stays fixed |
|---|---|---|
| List | The panel holding the table; the table body scrolls under a sticky header | Toolbar, status tabs, pager |
| Board | The board; each column scrolls on its own | Column headings (sticky) |
| Form | The form panel | The submit bar (`position: sticky; bottom: 0`) |
| Record | A grid whose columns each scroll | Header and tabs |
| Overview | The lower row of panels | Greeting, status bar, tiles |

Rules that make it work:

- Every flex or grid ancestor between `.content` and the scrolling element needs `min-height: 0`.
- Apply the rules only above a minimum width and height. Below that, pages scroll normally.
- When a list cannot scroll (the overview's "waiting longest" list), measure the box with a `ResizeObserver` and render only the rows that fit: `Math.floor(el.clientHeight / ROW_H)`. Keep `ROW_H` in step with the row height in CSS.
- Multi-column record pages: stack by default, two columns from 1101px, three from 1500px. To reorder items between a stacked and a column layout without duplicating markup, use `display: contents` on the wrapper and `order` on the children.
- Pages are full width beside the rail. Limit line length on text blocks (`max-width: 68ch` to `72ch`) instead of limiting the page.

## Tokens

All colour comes from custom properties on `:root`, grouped by role:

- Surfaces: `--paper` (page), `--surface` (cards), `--sunken` (insets), `--line`, `--line-strong`
- Text: `--ink`, `--muted`
- Brand: one dark colour for the rail, one accent used sparingly (active nav marker, selected state, focus of attention)
- Actions: `--primary`, `--primary-hi`, `--on-primary`, `--accent` (links and focus rings), `--danger`
- Charts: `--series-1` to `--series-4`

Choose the values for the project. Keep the roles.

## Status tones

A status is shown with a tone class that sets three variables. Badges, the overview bar, board columns and trackers all read the same three, so a status looks the same everywhere.

```css
.tone-prog { --tone: #1d4ed8; --tone-bg: #dfe9ff; --tone-solid: #3b7be0; }
.badge { background: var(--tone-bg); color: var(--tone); }
.badge-dot { background: var(--tone-solid); }
```

Map status names to tones in one place (`toneOf` in `assets/starter/ui.tsx`). Unknown statuses fall back to a neutral tone. Always show the status name beside the colour; never colour alone.

## Dark theme

Set `data-theme` on the `<html>` element and redefine the tokens under `:root[data-theme='dark']`. Start from the system preference, save the person's choice, and offer the toggle in the rail and the command palette. Tone classes get dark values for `--tone` and `--tone-bg`.

## Small screens

Under 860px: the rail becomes a drawer, two-column grids become one, toolbars wrap to full-width controls, fixed row heights become automatic.

## Standard states

- **Loading**: skeleton rows with a shimmer, `role="status"`.
- **Error**: what could not be loaded and the message.
- **Empty**: a title that says what is true ("Nothing matches these filters") and the next action as a button ("Clear filters" or "New request").
- **Toasts**: bottom right, `aria-live="polite"`, errors stay 8 seconds and others 5.
