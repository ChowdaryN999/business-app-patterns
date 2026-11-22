---
name: business-app-patterns
description: Proven patterns for internal business web apps built with React, TypeScript and Vite, including Power Apps code apps. Use when building or redesigning an intake, request, ticket, triage, approval, queue or tracker app, or when the user asks for a collapsible side navigation, command palette, fit-to-window pages, a one-page form with a review step, a sortable and filterable grid, a kanban board, role-based detail pages, a requester and admin conversation thread, status trackers, or dashboard motion such as rolling numbers. Also use when the user says "make it like the SAGE app".
---

# Business app patterns

These patterns come from the SAGE request-intake app (a Power Apps code app: React 19, TypeScript, Vite). They cover how the app is structured, navigated and laid out. They do not set the visual identity: colours, typeface and voice are chosen per project (use the `frontend-design` skill for that if it is installed).

Working code for every pattern is in `assets/starter/`. Read the matching file there before writing a pattern from scratch, then adapt names, colours and copy to the new project. Do not ship SAGE's names, logo, palette or wording in another app.

## Before building

Settle these with the user first. They decide most of the structure.

1. **Who uses it, in which roles.** For example requester, triager, specialist team, administrator. Each role gets its own view of a record, not one screen with hidden fields.
2. **The record and its statuses.** The list of statuses, in order, and which ones mean "closed".
3. **Where the data lives.** SharePoint lists, Dataverse, a REST API. This only affects one file (see Architecture).
4. **Where it runs.** A Power Apps code app sits inside a host frame, which changes routing and storage (see `references/architecture.md`).

## Stack

| Need | Use | Note |
|---|---|---|
| Routing | `react-router-dom` v7, `HashRouter` | Hash routing survives the Power Apps host frame |
| Grid | `@tanstack/react-table` **v8** | v9 has a different API; pin v8 |
| Command palette | `cmdk` | |
| Icons | `lucide-react` | |
| Charts | `recharts` | Feed series colours from CSS variables |
| Typeface | one `@fontsource-variable/*` family | Self-hosted, no CDN call |
| Tests | `vitest` on the pure logic | |
| Styling | one plain CSS file with custom properties | No CSS framework needed |

Dialogs and side sheets use the native `<dialog>` element, so focus trapping, Escape and the backdrop come from the browser.

## Architecture rules

1. **The UI talks to one interface.** `src/data/DataSource.ts` declares every outside call. `mock.ts` implements it in memory; a second file implements it against the real backend. Screens never import a connector or `fetch` directly.
2. **Rules are pure functions.** Everything that decides something (who may edit, what a save writes, which fields are required, what a status change triggers) lives in `src/logic/` as functions with no React and no I/O, covered by tests. A screen calls `planSomething(record, form, roles, user, now)`, gets back `{ ok: false, error }` or `{ ok: true, patch, summary }`, and only then writes.
3. **Every UI lock has a twin at the write.** If a button is hidden for a role, the plan function also refuses that role.
4. **One store.** `src/store.tsx` holds the user, roles, reference data, the cached record list, the draft, theme and toasts. Saves call `upsertRequest(saved)` so lists update without a reload.
5. **Personas for local work.** The mock reads `?as=requester|domain|ddat|admin` so every role can be checked in the browser without signing in.

Details and the Power Apps specifics: `references/architecture.md`.

## Pattern index

Read the reference file for the pattern being built.

| Pattern | What the user gets | Reference |
|---|---|---|
| Side rail | Collapsible navigation (Ctrl/⌘ B), count badges, role-aware links, drawer on phones, theme toggle | `references/navigation.md` |
| Command palette | Ctrl/⌘ K to jump to any page or record | `references/navigation.md` |
| Routes and deep links | Every record, tab and filter has a URL that can be shared | `references/navigation.md` |
| Fit to window | The page never scrolls; one region per page scrolls inside itself | `references/layout.md` |
| Tokens and dark theme | Colour roles, status tones, light and dark | `references/layout.md` |
| One-page form with review | Sections on one page, errors after first attempt, review dialog before submit, autosaved draft | `references/forms.md` |
| Choice cards and chips | Single and multiple choice shown as buttons | `references/forms.md` |
| Grid | Sort, search, URL filters, status tabs, reset, CSV export, empty states | `references/lists-and-records.md` |
| Board | Kanban by status with drag and drop through the same save rules | `references/lists-and-records.md` |
| Record page by role | Requester view, triage view, hand-off view, activity log | `references/lists-and-records.md` |
| Long text | 1000-word answers folded with "Show all N words" | `references/lists-and-records.md` |
| Conversation | Two-sided thread, "reply needed" flags, locked when the record closes | `references/lists-and-records.md` |
| Overview | Status bar, insight tiles, waiting-longest list that sizes itself, weekly chart | `references/lists-and-records.md` |
| Motion | Rolling numbers, bar fill, sheet and toast entrances, reduced-motion support | `references/motion.md` |

## Order of work

1. Types and statuses in `src/domain/types.ts`.
2. `DataSource` interface and the mock with realistic seeded records, including long text and every status.
3. Logic functions with tests.
4. Store, router and shell.
5. Screens: list first, then the record page, then the form, then the overview.
6. Fit-to-window rules last, once each page's content is settled.
7. Connect the real backend behind the interface.

## Quality bar

Check these before calling a screen done.

- Works with keyboard only; focus is visible; table rows open on Enter.
- Loading shows a skeleton, an error says what failed, an empty list says what to do next.
- Light and dark themes both checked.
- At 1320×720 and 1700×900 no page scrolls and no content is cut off; under 860px wide the rail becomes a drawer and pages scroll normally.
- `prefers-reduced-motion` turns the motion off.
- Button labels say what happens ("Submit request", "Save triage"), and the toast uses the same words.
- Every role checked through the mock persona, including a deep link opened by someone who should not see it.

## Lessons that cost time

- `@tanstack/react-table` v9 does not export `useReactTable`. Install v8.
- Do not animate the rail's width. Collapsing should be instant; a width transition makes the content reflow for its whole duration.
- Scope rail rules as `.rail .rail-close`, or the desktop/mobile show and hide rules lose on specificity.
- In a flex or grid layout that should scroll inside, every ancestor needs `min-height: 0`.
- `localStorage` can throw inside a host frame. Wrap every read and write, and make the app work without it.
- Keep content full width beside the rail. A `max-width` on the page leaves dead space when the rail collapses.
- A stored value that is no longer in the options list must still show in a select, not go blank.
