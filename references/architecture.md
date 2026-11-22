# Architecture

Starter files: `assets/starter/DataSource.ts`, `data-index.ts`, `store.tsx`, `conversation.ts`, `stats.ts`.

## Folders

```
src/
  domain/types.ts      record types, status names, choice lists
  data/DataSource.ts   the one interface the UI calls
  data/mock.ts         in-memory implementation with seeded records and personas
  data/power.ts        real implementation (connectors or API)
  data/power-wire.ts   converts backend field names to app types and back
  data/index.ts        picks mock or real at start-up
  logic/               pure rules and their tests
  components/          Shell, DataTable, CommandPalette, Conversation, ui
  screens/             one file per route
  store.tsx            app state
  index.css            the stylesheet
```

## The data interface

Screens only see `DataSource`. Adding a feature that needs new data means: add a method to the interface, implement it in the mock with seeded data, build and check the screen locally, then implement it for the real backend.

Keep backend naming out of the app. A wire file converts in both directions (`fromWire`, `toWire`), so a renamed column is a one-line change.

Choose the implementation at start-up:

```ts
export async function createDataSource(): Promise<DataSource> {
  const hosted = window.self !== window.top
  if (!hosted || new URLSearchParams(location.search).has('mock')) {
    return (await import('./mock')).createMockDataSource()
  }
  return (await import('./power')).createPowerDataSource()
}
```

Restrict queries on the server by role: a plain requester's list call filters to their own records, so other people's data is never downloaded.

## Plan functions

```ts
type Plan = { ok: false; error: string } | { ok: true; patch: RecordPatch; summary: string }
function planTriageSave(record, form, roles, user, now): Plan
```

The screen does: build the plan, show the error or write the patch, toast the summary. Because the function is pure, every rule has a test: role checks, required notes, what a status change sets or clears, what triggers a hand-off.

The form, the board's drag and drop, and any bulk action all call the same plan function.

## Store

One context provider. On start: load the user and reference data together, resolve roles, then load the record list (all records for a triager, own records otherwise), then the conversations for those records. A failure in a secondary load (group membership, conversations) degrades with a warning; it does not stop the app.

`Load<T>` is a three-way union used everywhere a screen waits for data:

```ts
type Load<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; rows: T }
```

## Roles

Resolve roles once at start-up into plain booleans (`canTriage`, `canEditDdat`, `canSeeDdatQueue`, `isSageAdmin`) plus the person's domain. Components read the booleans; they do not repeat the membership logic.

## Local personas

The mock data source reads `?as=requester|domain|ddat|admin` and returns a matching user and roles. Seed the mock with records in every status, a record with 1000-word answers, a closed record, and conversations waiting on each side.

## Power Apps code apps

A code app is a normal Vite app that Power Apps hosts in a frame and gives access to connectors.

- Packages: `@microsoft/power-apps`, `@microsoft/power-apps-vite` (Vite plugin), `@microsoft/power-apps-cli` (the `pa` command).
- Use `HashRouter`.
- Storage and clipboard can be blocked in the frame. Wrap them.
- The host adds its own header bar above the app, so check the fit-to-window layout inside the published app as well as locally.
- Each user needs a Power Apps Premium licence to run a code app.

Commands (run from the project folder):

```bash
npm run build
npx pa app push
npx pa app add data-source --non-interactive --connector shared_sharepointonline --connection-id <id> --as table --dataset "<site url>" --table <List name>
npx pa app refresh data-source --name <name> --non-interactive
```

`add data-source` generates typed models and services under `src/generated/`. Call them only from `data/power.ts`. After changing a list's columns, run `refresh data-source` before building.

SharePoint notes:

- Choice columns arrive as `{ Value }` objects and lookups as `{ Id, Value }`. Convert in the wire file.
- Read a choice column's options from the list so the app follows the list.
- Keep statuses in their own list with a sort order, so a new status is a new row, not a code change. Give each status a tone in `toneOf`.
- Index any column used to filter a large list (for example the record ID on a comments list).
- If a canvas app shares the same lists, adding optional columns and new lists is safe; renaming or making columns required is not.

Build and check in the development environment first. Publish to production only on the owner's explicit instruction.
