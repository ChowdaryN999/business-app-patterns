# Lists, records, conversation and overview

Starter files: `assets/starter/DataTable.tsx`, `Requests.tsx`, `DdatQueue.tsx`, `RequestPage.tsx`, `Conversation.tsx`, `Home.tsx`, `conversation.ts`, `stats.ts`.

## Grid

`DataTable` wraps TanStack Table v8: click a heading to sort, global search, 20 rows a page, and an `empty` slot. Rows are focusable and open on Enter or click. Each row has an `aria-label` ("Open DCOP-10001").

Around the grid:

- **Toolbar**: search box, then one select per filter, then a "Reset filters" button that appears only when a filter or search is active. View switch and export sit at the right end.
- **Filters in the URL**: read with `useSearchParams`, write with `replace: true` so the Back button is not filled with filter changes. Reset is `setParams({})`.
- **Status tabs** above the table with a count on each.
- **Columns**: keep only what helps someone pick a row. Put the ID first as a tag, then the subject clipped to one line, then who, type, status, age. Drop a column before letting the table scroll sideways.
- **Flags** beside the ID for things a triager must not miss (a category tag, "Reply needed").
- **CSV export** of the filtered rows.
- **Two empty states**: with filters ("Nothing matches these filters", button "Clear filters") and without (what the list is for, button for the main action).

## Board

Columns are the statuses; cards show ID, subject, who and age. Dragging a card to another column runs the same plan function as the edit form. If the rule refuses (for example a note is required to reject), the card stays and a toast gives the reason. Never write a status change from the board that the form would not allow.

## Record page

Header: ID tag, status badge, flags, type, "Copy link". Keep it to one row; the subject is shown in the body, with a visually hidden `<h1>` for screen readers.

Tabs, one per audience. Each is a route.

| Tab | For | Contains |
|---|---|---|
| Triage | Domain admin | The ask first, then at-a-glance facts, then the triage form, with the conversation alongside |
| Hand-off | Admin and the specialist team | What the specialist team needs to do and their assignment fields |
| Activity | Admin | Timeline of changes with who, when, what changed and notes |
| Requester's view | Admin | Exactly what the requester sees, marked as a preview |

A requester opening the record sees only the requester view: a progress tracker, the conversation, the outcome once there is one, then what they asked.

Rules:

- **The ask comes first.** Someone triaging must read the request before the decision fields. On one column the order is ask, form, supporting cards. On a wide screen it reads left to right: ask, decision, conversation.
- **Separate saves** for separate decisions, each through its own plan function.
- **Tracker**: the stages as a horizontal row of dots; done stages filled, the current one highlighted, with variants for waiting, paused and stopped. Under it, one sentence saying what is happening now and who has it.

## Long text

People paste up to 1000 words. Split a record's answers three ways:

- **Long answers** (description, business impact) as reading blocks: a small label, text at a comfortable line length (`max-width: 72ch`, `line-height: 1.6`), folded to about eight lines with a fade, and a button "Show all 412 words" / "Show less". Only show the button when the text overflows (compare `scrollHeight` with `clientHeight` in `useLayoutEffect`).
- **Short answers** as a fact grid (label above value).
- **Blanks** named together in one line ("Left blank: Due date, Report link") instead of a row each.

Always render with `white-space: pre-wrap; overflow-wrap: anywhere` so line breaks survive and long links do not break the layout.

## Conversation

A two-sided thread on the record, between the requester and the team handling it. It replaces email back and forth.

- One row per message: record ID, body, author name, author email, side (`requester` or `admin`), created time.
- The viewer's own messages sit on the right with a tinted background; the other side on the left with a label for the side.
- The composer says who will see the message and whether a notification is sent.
- **Closed means closed.** When the record's status is a closed one, the composer is replaced with a notice. The same check runs in `planComment`, so a write is refused even if the UI is bypassed.
- **Who owes a reply** is whoever did not write the last message (`waitingOn`). Use it for a "Reply needed" flag in the grid, a filter chip, a dot on the record tab, a tile on the admin's overview, and a banner on the requester's overview.
- On the admin's record page the conversation is part of the triage view, not its own tab.

```ts
export function waitingOn(r, all) {
  if (conversationClosed(r)) return null
  const last = commentsFor(all, r.id).at(-1)
  if (!last) return null
  return last.role === 'admin' ? 'requester' : 'admin'
}
```

## Side sheet

For a quick edit from a queue without leaving the list: a native `<dialog>` docked to the right, with a header (ID and meta), a scrolling body, and a footer holding the save button. It is a route, so it can be linked.

## Overview

Top to bottom, all on one screen:

1. Greeting, date and the primary action.
2. Notices only when relevant (unfinished draft, a reply is owed).
3. A scope select for triagers. A domain admin lands on their own domain; an administrator on everything. Offer "Back to my domain" after switching.
4. One status bar: a segment per status, sized by count, with the counts underneath as links into the filtered list. Hovering a count dims the other segments.
5. A row of insight tiles, each answering one question a triager asks: how many open, how many unassigned, how many replies owed, how many waiting on another team, how old the oldest is.
6. Two panels: "Waiting longest" (rows sized to fit, each a link) and a weekly intake chart by type.

Every number is a link to the list that explains it. Compute them in `src/logic/stats.ts`, not in the component.
