# Graph Report - business-app-patterns  (2026-11-24)

## Corpus Check
- Corpus is ~46,673 words - fits in a single context window. You may not need a graph.

## Summary
- 294 nodes · 489 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.81)
- Token cost: 242,428 input · 0 output

## Community Hubs (Navigation)
- Architecture & Data Patterns
- UI & Layout Guidelines
- App Shell & Navigation
- App Bootstrap & Store
- Tables, Queue & Home
- SAGE Demo & Build Story
- Request Detail Page
- DataSource Interface
- Request Stats Helpers
- New Request Form
- Triage Rules
- Opex Home Mock-up
- Comment Rules
- Dependent Fields
- Long Answer Folding
- Reset Filters Button
- Front Store Rx Question

## God Nodes (most connected - your core abstractions)
1. `Pattern Index` - 15 edges
2. `DataSource` - 12 edges
3. `Routes and Deep Links` - 12 edges
4. `Business App Patterns Skill` - 9 edges
5. `Side Rail` - 8 edges
6. `RequesterView()` - 7 edges
7. `RequestPage()` - 7 edges
8. `Plan Functions (pure rules)` - 7 edges
9. `Grid (DataTable)` - 7 edges
10. `Overview Dashboard` - 7 edges

## Surprising Connections (you probably didn't know these)
- `roll() rolling-number odometer` --semantically_similar_to--> `Overview motion: clip-path status bar and odometer numbers`  [INFERRED] [semantically similar]
  examples/opex-home.html → sage-app/SAGE-BUILD-STORY.md
- `App search filter with gliding cards and '/' shortcut` --semantically_similar_to--> `Command palette (Ctrl/Cmd K, cmdk)`  [INFERRED] [semantically similar]
  examples/opex-home.html → sage-app/SAGE-BUILD-STORY.md
- `Card grows into app page (shared view-transition-name)` --conceptually_related_to--> `Request page tabs per role (Requester, Triage, DDAT hand-off, Activity)`  [AMBIGUOUS]
  examples/opex-home.html → sage-app/SAGE-BUILD-STORY.md
- `Pattern Index` --references--> `Kanban Board`  [EXTRACTED]
  SKILL.md → references/lists-and-records.md
- `Power Apps Code App` --references--> `Power Apps Code Apps Hosting`  [EXTRACTED]
  SKILL.md → references/architecture.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **All write paths share pure plan functions** — references_architecture_plan_functions, references_architecture_plantriagesave, references_lists_and_records_plancomment, references_lists_and_records_board, references_forms_saving_on_edit_screens, skill_ui_lock_twin_rule [INFERRED 0.85]
- **Every view is a shareable URL** — references_navigation_routes, references_lists_and_records_url_filters, references_lists_and_records_side_sheet, references_lists_and_records_record_page, references_navigation_hashrouter [INFERRED 0.85]
- **Overview load moment (rolling numbers + bar fill + tiles)** — references_lists_and_records_overview, references_lists_and_records_status_bar, references_lists_and_records_insight_tiles, references_motion_rollingnumber, references_motion_status_bar_fill, references_motion_timing [INFERRED 0.75]
- **Data interface + pure rules enable UI rebuild and local-first checking** — sage_app_sage_build_story_one_data_interface, sage_app_sage_build_story_rules_as_pure_functions, sage_app_sage_build_story_redesign, sage_app_sage_build_story_local_first [EXTRACTED 1.00]
- **Rolling-number odometer flow in opex home** — examples_opex_home_render, examples_opex_home_rollall, examples_opex_home_show, examples_opex_home_roll [EXTRACTED 1.00]
- **SAGE request lifecycle across requester, triage and DDAT** — sage_app_sage_build_story_one_page_form, sage_app_sage_build_story_role_tabs, sage_app_sage_build_story_conversation_thread, sage_app_sage_build_story_ddat, sage_app_sage_app_demo_ddat_queue [INFERRED 0.85]

## Communities (17 total, 4 thin omitted)

### Community 0 - "Architecture & Data Patterns"
Cohesion: 0.07
Nodes (25): business-app-patterns README, createDataSource, DataSource Interface, src Folder Structure, Local Personas (?as=requester|domain|ddat|admin), pa CLI (add/refresh data-source, app push), Plan Functions (pure rules), planTriageSave (+17 more)

### Community 1 - "UI & Layout Guidelines"
Cohesion: 0.09
Nodes (32): Load<T> Three-Way Union, Roles Resolved to Booleans, App Store (single context provider), Chips (pick several), Choice Cards (pick one), Dark Theme (data-theme), ResizeObserver Row Fitting, Small Screens (<860px) (+24 more)

### Community 2 - "App Shell & Navigation"
Cohesion: 0.10
Nodes (11): CommandPalette(), Conversation(), SIDE_LABEL, readCollapsed(), Shell(), Avatar(), RequestTag(), StatusBadge() (+3 more)

### Community 3 - "App Bootstrap & Store"
Cohesion: 0.08
Nodes (13): App(), root, AppProvider(), AppState, Boot, Ctx, errText(), initialTheme() (+5 more)

### Community 4 - "Tables, Queue & Home"
Cohesion: 0.10
Nodes (15): columns, DdatQueue(), Ticket(), Home(), NONE, REEL, RollingNumber(), TYPE_FILL (+7 more)

### Community 5 - "SAGE Demo & Build Story"
Cohesion: 0.10
Nodes (19): App search filter with gliding cards and '/' shortcut, transition() View Transitions wrapper, SAGE single-file demo (sample data), Application register and AI Governance review, Help panel FAQ (request types, priorities, statuses), Demo routes (hub, requests/:id/:tab, new, ddat/:id, register), Demo 'view as' role switcher (?as= param), How the SAGE request-intake app was built (+11 more)

### Community 6 - "Request Detail Page"
Cohesion: 0.17
Nodes (20): ActivityView(), Asked(), AtAGlance(), DdatPart, ddatPart(), ddatProgress(), DdatView(), isHttp() (+12 more)

### Community 7 - "DataSource Interface"
Cohesion: 0.13
Nodes (3): createDataSource(), DataSource, RequestFilter

### Community 8 - "Request Stats Helpers"
Cohesion: 0.18
Nodes (11): ageDays(), csvCell(), isOpen(), oldestOpen(), StatusCount, toCsv(), TriageInsights, triageInsights() (+3 more)

### Community 9 - "New Request Form"
Cohesion: 0.23
Nodes (11): Area(), bySort(), errFor(), FieldProps, NewRequest(), Platforms(), ReviewSummary(), Set (+3 more)

### Community 10 - "Triage Rules"
Cohesion: 0.29
Nodes (10): closing(), ddatOpen(), ddatStage(), initialTriageForm(), isCompleted(), isEscalated(), planTriageSave(), statusOptions() (+2 more)

### Community 11 - "Opex Home Mock-up"
Cohesion: 0.20
Nodes (8): Operations home mock-up (opex-home.html), APPS catalog (live vs coming-soon applications), banner() animated carousel with scenes, render() live and coming-soon app cards, roll() rolling-number odometer, rollAll(), show() carousel slide switch, SLIDES highlights banner data

### Community 12 - "Comment Rules"
Cohesion: 0.31
Nodes (8): cannotPost(), CommentPlan, commentsFor(), conversationClosed(), isRequesterOf(), planComment(), Side, waitingOn()

## Ambiguous Edges - Review These
- `Card grows into app page (shared view-transition-name)` → `Request page tabs per role (Requester, Triage, DDAT hand-off, Activity)`  [AMBIGUOUS]
  examples/opex-home.html · relation: conceptually_related_to

## Knowledge Gaps
- **19 isolated node(s):** `business-app-patterns README`, `src Folder Structure`, `planTriageSave`, `Load<T> Three-Way Union`, `pa CLI (add/refresh data-source, app push)` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Pattern Index` connect `UI & Layout Guidelines` to `Architecture & Data Patterns`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `business-app-patterns README`, `src Folder Structure`, `planTriageSave` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture & Data Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.06984126984126984 - nodes in this community are weakly interconnected._
- **Why does `Routes and Deep Links` connect `UI & Layout Guidelines` to `Architecture & Data Patterns`, `App Bootstrap & Store`, `Tables, Queue & Home`, `Request Detail Page`, `New Request Form`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `UI & Layout Guidelines` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Why does `Command palette (Ctrl/Cmd K, cmdk)` connect `SAGE Demo & Build Story` to `App Shell & Navigation`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Card grows into app page (shared view-transition-name)` and `Request page tabs per role (Requester, Triage, DDAT hand-off, Activity)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._