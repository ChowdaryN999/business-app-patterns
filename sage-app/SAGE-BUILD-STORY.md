# How the SAGE request-intake app was built

SAGE is a request-intake app for an analytics team. People submit a request (an incident, a data extract, an enhancement, or a new report), a domain admin triages it, and some requests are handed off to a specialist data team (DDAT).

This document covers where the build started, each change that was asked for, and how each one was done.

**Try it:** download [`sage-app-demo.html`](sage-app-demo.html) and open it in Chrome or Edge. It is the whole app in one file, running on sample data. Nothing is saved and nothing is sent anywhere. Use the "Demo: view as" control at the bottom right to switch between a requester, a domain admin, a DDAT member and an administrator.

The reusable patterns from this build are packaged as a Claude skill in this repository (`SKILL.md` and `references/`).

## Where it started

The app already existed twice:

1. A **Power Apps canvas app**, live, built with the drag-and-drop designer on top of SharePoint lists.
2. A **Power Apps code app**: a first port of the canvas app to React, TypeScript and Vite. It worked, but it copied the canvas app screen for screen, so it looked and behaved like one: a top banner, three wizard screens for a new request, one crowded detail screen for everyone.

The first request was:

> "We are rebuilding the sage app using codeapps in powerapps, but we want to use all the coding components that got available in code apps, currently it looks the same as canvas app"

Two things in the first port were kept, because they were already right:

- **One data interface.** Screens call `DataSource` and never a connector directly. There are two implementations: an in-memory one with sample data, and one that talks to SharePoint through the generated Power Apps services.
- **Rules as pure functions.** Who may edit, what a save writes, which fields are required: all in `src/logic/` with unit tests, and no React.

Because of those two, the whole interface could be rebuilt without touching the data or the business rules, and every change could be checked locally in each role before it went near real data.

## The redesign

Libraries added: `react-router-dom` (routing), `@tanstack/react-table` v8 (grid), `cmdk` (command palette), `recharts` (chart), `lucide-react` (icons), and one self-hosted variable typeface. Styling is one plain CSS file with custom properties. Dialogs and side sheets use the browser's native `<dialog>`.

What changed in the first pass:

| Before | After |
|---|---|
| Top banner with buttons | Side rail with role-aware links, a count of requests pending review, and a theme toggle |
| Screens switched by state | Real routes, so every request, tab and filter has a link that can be shared |
| No search | Command palette (Ctrl/⌘ K) to jump to any page or request |
| A gallery of requests | A sortable, searchable grid, plus a board view by status with drag and drop |
| No overview | A status bar, insight tiles, a "waiting longest" list and a weekly chart |
| Light only | Light and dark themes |

One lesson from this step: version 9 of `@tanstack/react-table` has a different API from the widely documented one, so the build is pinned to version 8.

## The changes that followed

Each of these came from using the app and saying what felt wrong. The request is quoted, then how it was done.

### Collapsible side rail

> "can we hide expand the left side"

The rail's width is one CSS variable, and the content area uses the same variable as its left margin. Collapsing sets the variable from 248px to 64px and hides every text label, leaving icons with tooltips. The choice is remembered, and Ctrl/⌘ B toggles it. The width change is instant; an animated width made the whole page reflow for its duration.

A follow-up ("when the left bar opened vs closed the body is remaining the same leaving space") was fixed by removing the page's maximum width, so the content takes the room the rail gives up.

### A request page for each role

> "i want to separate out what the requestor is able to see what the triage domain admin screen and the ddat transition"

The single detail screen became tabs, each a route:

- **Requester's view**: a progress tracker, the conversation, the outcome, then what they asked.
- **Triage**: for the domain admin.
- **DDAT hand-off**: what the specialist team needs to do and their assignment.
- **Activity**: a timeline of every change.

A requester only ever sees the first one. Triage and hand-off have separate save buttons, each going through its own rule function, so saving one cannot overwrite the other.

A later request, "in the triage screen they need to see the ask first before they move to triage", set the reading order: the ask, then the decision, then the conversation. On a wide screen those are three columns; on a laptop the order is kept in one column using CSS `order`, without duplicating any markup.

### Long answers

> "sometimes user submits upto 1000 words in business impact and issue"

Answers are split three ways. Long ones become reading blocks at a comfortable line length, folded to about eight lines with a fade and a "Show all 412 words" button that appears only when the text overflows. Short ones go in a compact fact grid. Fields left blank are named together in one line.

### One-page form with a review step

> "right now we have three screens instead let us make it one and when click review and submit a pop up on the screen"

The three wizard screens became one page with three sections. "Review and submit" validates first; if something is missing it scrolls to the first problem and puts the cursor there. If everything is filled, a dialog shows the answers as the team will receive them, with "Keep editing" and "Submit request". The draft is saved on the device as the person types.

> "these are not showing as buttons that they need to select"

The choices for requesting team, request type and priority became cards with a radio circle, a "Select one" cue, a border and a slight shadow. Underneath they are a real radio group, so arrow keys and screen readers work.

### Motion on the overview

> "can we have the animation effect here" … "it is fast" … "how about motion on the numbers?"

All hand-written CSS and one small React component, with no animation library:

- The status bar is revealed left to right with `clip-path`.
- Each number rolls like an odometer: every digit is a strip of 0 to 9 that slides to its value, one digit after another.
- The first version ran in under a second and was too fast to notice. Both now take about 2.2 seconds.
- Everything is switched off for people who have reduced motion turned on.

### Insights for a domain admin

> "when a domain admin logs in … there is no way to see his domain requests insights"

The overview got a domain filter. A domain admin lands on their own domain; an administrator on everything. Tiles answer what a triager asks first: how many open, how many unassigned, how many replies are owed, how many are waiting on DDAT, and how old the oldest is. Each number links to the list that explains it.

> "i do not want a scroll on the first page"

The "By domain" panel was removed, and the "waiting longest" list now measures its own box and shows only as many rows as fit.

### A "Not Started" status

> "introduce the not started workflow add that as a new in sharepoint"

Statuses live in their own SharePoint list with a sort order, so this was one new row there plus a colour in the app. The rule that decides when a request is handed to DDAT was updated and covered by a test.

### Front Store or Rx

> "sometimes the domain admins wants to know if it is a rx"

One optional question on the form (Front Store, Rx, Both, Not sure), stored in a new choice column. Where it matters, a red "Rx" tag appears beside the request ID in the grid, the board, the queue and the request header, so a triager sees it without opening the request.

### Conversation between requester and admin

> "if the domain does not understand about the ticket they are sending email out of sage introducing manual work … no comments to be entered after the request is closed"

A two-sided thread on each request, stored in a new SharePoint list (request ID, message, author, side).

- The person whose turn it is to reply is worked out from who wrote the last message. That drives a "Reply needed" flag in the grid, a tile on the admin's overview and a banner on the requester's overview.
- When a request is completed or rejected, the reply box is replaced by a notice. The same check runs in the function that writes a message, so it holds even if the interface is bypassed.
- It was built and shown on sample data first, then connected to SharePoint once the design was agreed.

### Fit to the window

> "overall application should fit into the screen have the scroll inline for each one"

On desktop the page itself never scrolls. Each page marks one region to fill the remaining height and scroll inside itself: the table body under a fixed header, each board column, the form above a fixed submit bar, each column of the request page. Below a minimum width and height, pages scroll normally. The conversation moved into the triage view instead of being its own tab.

### Small clean-ups

- "remove area from the grid": one column fewer, so the grid no longer needs to scroll sideways.
- "remove it so we get more space": the large subject line in the request header went, since the ask shows it directly below.
- "i do not have reset filter": a "Reset filters" button that appears only when a filter or search is active.

## How the work was done

- **Local first.** Every change was built against sample data and checked in the browser in each role, at laptop and wide sizes, in light and dark, before going further.
- **Rules tested.** 32 unit tests cover the business rules. A change to a rule came with a change to its test.
- **Pushed on request.** The app was published to the development environment only when asked, one push per approval. Production was not touched.
- **Small steps.** Most changes were a sentence of feedback and a few minutes of work, checked and then shown.

## What is not done

- Email notifications for conversation messages are not built; the reply box says so.
- DDAT members cannot post in the conversation; only the requester and domain admins can.
- The resource links in the side rail point to placeholders.
- The app's script is one large file and has not been split for faster loading.

## About the demo file

`sage-app-demo.html` is built from the same source as the real app, with three differences:

- It always uses the sample data source. The SharePoint connector code is left out of the file.
- The names of real team members are replaced with invented ones.
- It adds the "Demo: view as" control.
