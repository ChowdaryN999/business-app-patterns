# Forms

Starter files: `assets/starter/NewRequest.tsx`, `assets/starter/ui.tsx` (`Field`, `Select`, `ChoiceCards`, `ChipSelect`, `Dialog`), and the "Forms" and "New request" sections of `assets/starter/index.css`.

## One page, then a review dialog

Do not split a form across wizard screens. Put every question on one page in named sections ("Who is asking", "What you need", "Details"). Questions that depend on an earlier answer appear in place once that answer is given.

The submit button reads "Review and submit". Pressing it:

1. Validates. If anything is missing, shows the errors and takes the reader to the first one.

   ```tsx
   setTried(true)
   requestAnimationFrame(() => {
     const first = form.current?.querySelector('.field-bad')
     first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
     first?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
   })
   ```

2. If valid, opens a dialog titled "Check your request" that shows the answers as they will be received, with two buttons: "Keep editing" and "Submit request".

After a successful submit: put the saved record in the store, clear the draft, show a toast, and go to the new record's page. If the submit fails, close the dialog, keep every answer, and say what went wrong.

## Validation

- Errors appear only after the first attempt (`tried`), then clear field by field as each is fixed.
- "Is this complete?" is a pure function in `src/logic/` that returns the list of missing fields. The form and the tests use the same function.
- Each error says what to do ("Choose one to continue."), sits under its field, and is linked with `aria-describedby`.

## Draft autosave

Every change writes the draft to `localStorage` (inside try/catch). The overview shows a notice with "Continue draft" and "Discard draft" when an unfinished draft exists. The form has "Start over".

## Choice cards (pick one)

Use when there are two to six options and the choice matters, such as request type or priority. Each option is a card with a radio circle, a title and an optional one-line description.

- It is a real radio group: a `<fieldset>` with a `<legend>`, and a visually hidden `<input type="radio">` inside each `<label>`. Arrow keys and screen readers work without extra code.
- The legend carries a "Select one" cue so the cards read as choices, not as information.
- The unselected card has a border and a slight shadow so it looks pressable. The selected card has a filled radio, a tinted background and a stronger border.
- Keyboard focus shows on the card: `.choice:has(input:focus-visible)`.
- Pass `required={false}` for optional questions.

## Chips (pick several)

Checkbox inputs inside pill-shaped labels. Every option is visible at once; nothing to open.

## Selects

Use a native `<select>` for long lists (locations, people's teams). The shared `Select` keeps showing a stored value even when it is no longer in the options.

## Dependent fields

When one field narrows another (sub-team, then assignee), disable the second until the first is chosen, explain why in the hint ("Choose a sub-team first."), and clear the second whenever the first changes.

## Saving on edit screens

- One save button per decision area (for example "Save triage" and "Save hand-off"), not one for the whole page.
- The button shows "Saving" and is disabled while the write runs.
- The success toast names what changed ("Saved: status In Progress, assigned to Priya.").
- A read-only role sees the same fields disabled, with one line saying who can edit them.
