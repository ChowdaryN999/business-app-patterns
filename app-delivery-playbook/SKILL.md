---
name: app-delivery-playbook
description: How to build and change an internal business web app quickly and safely, with the stack, the edit-check-verify-publish loop, and the practices that worked on the SAGE request-intake app (a Power Apps code app in React, TypeScript and Vite). Use when starting a similar app, when asked to "make a change and show me", when publishing a demo copy to GitHub, or when the user asks which frameworks and best practices to follow.
---

# App delivery playbook

This is the working method behind the SAGE app: what it is built with, how a change goes from request to something the owner can see in a few minutes, and what was learned doing it. For the screen patterns themselves (navigation, fit-to-window pages, forms, grids, motion), use the companion skill `business-app-patterns`.

## The stack, and why each piece is there

| Piece | Used for | Why this one |
|---|---|---|
| React 19 + TypeScript | The app | Types catch most mistakes before the browser does |
| Vite | Dev server and build | Starts in a second, reloads on save, builds in under a second |
| Power Apps code app (`@microsoft/power-apps`, `pa` CLI) | Hosting, sign-in, SharePoint connector | The company already licenses it; no server to run |
| React Router (hash routes) | Pages | The Power Apps host owns the path, so routes must live after `#` |
| TanStack Table v8 | Sortable, filterable grids | Headless, so the table looks like the app. Stay on v8; v9 has a different API |
| cmdk | Command palette (Ctrl/⌘ K) | Small and accessible out of the box |
| recharts | The few charts | Enough for bar charts; not worth a bigger library |
| lucide-react | Icons | One consistent set |
| Archivo variable font | Type | One file covers every weight and width |
| vitest | Tests for business rules | Runs the whole suite in half a second |
| Plain CSS with tokens | Styling | One stylesheet, colours as `--tokens`, light and dark from the same rules |

No UI kit, no CSS framework, no state library. Motion is hand-written CSS and a little script; a library is only worth adding when CSS cannot do the job.

## How the code is laid out

This layout is what makes changes fast, because each kind of change has one obvious home.

- `src/domain/` holds record types and fixed lists. It knows nothing about SharePoint.
- `src/logic/` holds every business rule as a pure function, with tests beside it. No React, no I/O.
- `src/data/DataSource.ts` is the one interface screens call. `mock.ts` implements it in memory with seeded records; `power.ts` implements it against SharePoint.
- `src/screens/` has one file per route. `src/components/` has the shared pieces.
- `src/index.css` is the whole stylesheet.

Two consequences worth keeping:

1. **Build against the mock first.** Every feature works on sample data, in every role, before SharePoint is touched. Roles are switched with `?as=requester|domain|ddat|admin` in the address.
2. **Every lock in the interface has a twin in a rule.** A button that is hidden is also refused by the function behind it, and that refusal has a test.

## The loop for one change

Keep each step small and run them in this order. Most changes take a few minutes.

1. **Find the place.** Search for the text on screen or the class name; read only the lines around it.
2. **Make the edit.** A rule goes in `src/logic/` with a test. A look goes in `index.css`. A screen change goes in its one file.
3. **Type-check:** `npx tsc --noEmit -p .`
4. **Look at it.** Open the local app and check the change the way the owner would see it: the right role, the right screen, then a screenshot. Check the other theme and a narrow width when layout or colour changed.
5. **Run the tests and build:** `npx vitest run` then `npm run build`.
6. **Report plainly.** Say what changed, what was checked, and what was not.

Things that keep the loop honest:

- **Measure, don't eyeball, when it matters.** For "is it centred", "does it overlap", "does the table fit", read positions from the page and compare numbers. A screenshot at half scale hides a 10 pixel overlap.
- **Test both directions and the edges.** A scroll effect was checked going down only, and it broke going up. Check forwards, backwards, and a jump past the end.
- **Reload before concluding.** A page can keep running old code after an edit. If a fix "did not work", reload and test again before changing more.
- **One viewport size per check.** Set an explicit size, test, then reset. A preview pane that changes width mid-test gives results that contradict each other.

## Working with the owner

These habits saved more time than any tool.

- **Lead with the answer.** One line that answers the question, then detail. No menu of clarifying questions when a sensible default exists.
- **Show, don't describe.** When the owner is choosing a look, put the options on the real page (or beside each other) and let them click. Remove the chooser once they pick.
- **Do not invent content.** Counts, ratings, extra teams, descriptions and labels that nobody asked for were all removed again. If content is needed and unknown, use the plainest placeholder and say it is a placeholder.
- **Take corrections literally and record them.** When the owner states a rule ("we cannot classify a request"), apply it everywhere and write it into `CLAUDE.md` with the date, so it is never broken again.
- **Offer best practice, then follow their choice.** Look up guidance when placement or behaviour is in doubt, give a recommendation with the trade-off, and build what they choose even if it differs.
- **When a request is ambiguous and cheap to try, try the likely reading and say what was assumed.** When it is ambiguous and costly or public, ask one question first.
- **Say what was not verified.** "Checked at desktop width in light theme; dark theme and phone width not viewed" is more useful than "done".

## Publishing a demo copy

The demo is one HTML file that runs on sample data, for sharing outside the tenant.

```bash
npx vite build --config vite.demo.config.ts && node demo/inline.mjs publish/sage-app-demo.html
```

The demo build swaps the SharePoint data layer for the mock, replaces real colleagues' names with invented ones, and inlines every script, style, font and image into the single file.

Before it goes anywhere public:

1. Run the tests.
2. Scan the file for anything real: colleague names, the SharePoint address, the tenant name.
3. Look for anything new that identifies the company (site names, locations, product names) and ask the owner whether it may be public. Their earlier approval to publish does not cover content added since.

Uploading to GitHub without the `gh` tool signed in works through the browser:

1. Open `https://github.com/<owner>/<repo>/upload/main/<folder>`.
2. Put the file into the page's file input (do not click it; set it directly).
3. Wait until the file name is listed, type a commit summary, and press **Commit changes**.
4. **Stay on the page until "Processing your files…" finishes** and the repository page appears. Leaving early silently discards the commit.
5. Confirm the new commit is at the top of the history before saying it is published.

Pushing the real app (`npx pa app push`) is separate: development tenant only, and each push needs the owner's go-ahead for that push.

## Practices that held up

**Structure**
- Rules are pure functions with tests; screens only call them.
- New data goes mock first, SharePoint second. Only add optional columns or new lists when another app shares the lists.
- Generated data (such as a map outline) comes from a script kept in the repository, with its source and licence written in the output file.

**Interface**
- Work screens fit the window and stay quick. One showpiece screen may scroll and carry rich motion.
- A pick-one question shows radio buttons; a pick-several question shows checkboxes.
- Fixed things stay fixed: help, navigation and primary actions are in the same place on every screen that has them.
- Nothing floats over controls. If something must sit at an edge, give it its own margin.
- Colours are tokens. A tint derived from the accent changes when the accent changes, so check every derived colour after a palette change.
- The accent should not sit close to the error colour or to a status colour.

**Motion**
- Tie motion to meaning: a line that draws is a route, a number that rolls is a count, a card that writes itself is a request being sent.
- Play a scroll-driven sequence once on the way down; do not make people rewind it to scroll back up.
- Run ambient motion only while it is on screen, pause it on hover, and stop all of it under reduced motion.
- A status, label or highlight changes when the moving thing arrives, not when it is half-way there.

**Compliance and privacy**
- Maps of a country come from an official source, never drawn by hand, with the source credited.
- Ask before downloading anything, and say what it is, where it comes from, its size and its licence.
- Anything public goes through the demo build, and the owner decides what real information may appear.
- A help feature that answers from a fixed list needs no AI, no connector and stores nothing; say so plainly when asked.

**Help content**
- Match on words, answer only when the match is firm, and offer "did you mean" when it is not.
- Show the matched question above the answer so a wrong match is obvious.
- Handle greetings, thanks and "are you a bot" as conversation, not as failed questions.
- Keep the question list in one file with tests for the phrasings people actually use.

## Mistakes worth not repeating

- Declaring a scroll effect fixed after testing one direction.
- Navigating away from GitHub's upload page before processing finished.
- Removing a block of CSS with too wide a match and deleting a neighbouring rule.
- Trusting a screenshot taken mid-animation.
- Correcting the scroll position by hand while the browser was also correcting it, which doubled the jump.
- Assuming a derived colour would still look right after the accent changed.
- Centring something at one screen size and leaving the other sizes as they were.
