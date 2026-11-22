# Navigation

Starter files: `assets/starter/Shell.tsx`, `assets/starter/CommandPalette.tsx`, `assets/starter/App.tsx`, and the "Shell" and "Collapsed rail" sections of `assets/starter/index.css`.

## Side rail

Structure, top to bottom:

1. Logo and the collapse toggle.
2. The primary action as a button ("New request").
3. A search button that opens the command palette and shows its shortcut.
4. Main links (`NavLink`, so the active link styles itself). Links the role cannot use are not rendered.
5. Resource links, pushed to the bottom with `margin-top: auto`.
6. The signed-in person, their role in words, and the theme toggle.

Behaviour:

- The rail's width is one CSS variable. The content area uses the same variable as its left margin, so the two can never disagree.

  ```css
  :root { --rail: 248px; }
  .rail { position: fixed; inset: 0 auto 0 0; width: var(--rail); }
  .content { margin-left: var(--rail); min-width: 0; }
  @media (min-width: 861px) { .shell.collapsed { --rail: 64px; } }
  ```

- Collapsed means icons only. Wrap every text label in `<span class="rail-label">` and hide `.rail-label` when collapsed. Give each link a `title` so the icon still has a tooltip.
- The collapsed state is saved in `localStorage` (inside try/catch) and toggled with Ctrl/⌘ B. The toggle button carries `aria-expanded`.
- No width transition. The change is instant.
- Count badges (for example "pending review") sit at the right of a link, and move to the icon's corner when collapsed.
- Below 861px the rail is a drawer: off-screen by default, opened from a top bar with a menu button, closed by a scrim, a close button, or any route change.

  ```tsx
  useEffect(() => {
    setNavOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])
  ```

- A "Skip to content" link is the first element in the shell.

## Command palette

`cmdk`'s `Command.Dialog`, opened with Ctrl/⌘ K or the rail's search button. Two groups:

- **Go to**: every page the role can open, plus "Switch theme".
- **Records**: one item per cached record. Set the item's `value` to everything a person might type (ID, requester name, subject, type), and render the ID tag, subject and status badge.

The empty message suggests what to type ("Try a request ID such as DCOP-10001").

## Routes

Use `HashRouter` when the app runs inside a host frame. All routes sit under the shell:

```tsx
<Route element={<Shell />}>
  <Route index element={<Home />} />
  <Route path="new" element={<NewRequest />} />
  <Route path="requests" element={<Requests />} />
  <Route path="requests/:id" element={<RequestPage />} />
  <Route path="requests/:id/:tab" element={<RequestPage />} />
  <Route path="ddat" element={<DdatQueue />} />
  <Route path="ddat/:id" element={<DdatQueue />} />
</Route>
```

Rules:

- A record's tab is part of the URL (`/requests/42/activity`), so a link opens the right view.
- A side sheet over a list is also a route (`/ddat/42`). Closing it navigates back to the list.
- List filters live in the query string (`?status=On%20Hold&team=DC%20Ops`), so a filtered list can be bookmarked and overview tiles can link straight into it.
- Guard deep links by role inside the page. A requester who opens someone else's record gets an explanation, not a blank screen.
- Offer "Copy link" on the record page.
