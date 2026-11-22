import type { ColumnDef } from '@tanstack/react-table'
import { Columns3, Download, Plus, RotateCcw, Rows3, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable } from '../components/DataTable'
import { Empty, RequestTag, RxTag, Select, SkeletonRows, StatusBadge, toneOf } from '../components/ui'
import type { SageRequest } from '../domain/types'
import { summaryOf } from '../logic/details'
import { anyRequestFilter, DDAT_FILTER_OPTIONS, filterRequests } from '../logic/filters'
import { waitingOn } from '../logic/conversation'
import { coalesce, fmtDate } from '../logic/format'
import { ageDays, ageLabel, statusCounts, toCsv } from '../logic/stats'
import { initialTriageForm, planTriageSave } from '../logic/triage'
import { useApp } from '../store'

const NONE: SageRequest[] = []
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0)

/** `needsReply` holds the ids where the conversation is waiting on the person looking at the list. */
const buildColumns = (needsReply: Set<number>): ColumnDef<SageRequest, unknown>[] => [
  {
    id: 'id',
    header: 'Request',
    accessorFn: (r) => r.title,
    cell: (c) => (
      <span className="cell-tags">
        <RequestTag id={coalesce(c.row.original.title, 'N/A')} />
        <RxTag area={c.row.original.businessArea} />
      </span>
    ),
  },
  {
    id: 'summary',
    header: 'Subject',
    accessorFn: summaryOf,
    cell: (c) => (
      <span className="cell-tags">
        <span className="cell-clip">{c.getValue() as string}</span>
        {needsReply.has(c.row.original.id) && <span className="reply-flag">Reply needed</span>}
      </span>
    ),
  },
  { id: 'requester', header: 'Requester', accessorFn: (r) => r.requesterName },
  { id: 'type', header: 'Type', accessorFn: (r) => r.requestType?.value ?? '' },
  { id: 'priority', header: 'Priority', accessorFn: (r) => r.priority?.value ?? '' },
  {
    id: 'created',
    header: 'Submitted',
    accessorFn: (r) => time(r.created),
    cell: (c) => fmtDate(c.row.original.created),
    enableGlobalFilter: false,
  },
  {
    id: 'completed',
    header: 'Completed',
    accessorFn: (r) => time(r.completionDate),
    cell: (c) => fmtDate(c.row.original.completionDate) || <span className="muted">Not yet</span>,
    enableGlobalFilter: false,
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (r) => r.requestStatus?.value ?? '',
    cell: (c) => <StatusBadge status={c.getValue() as string} />,
  },
]

function Board({ rows, onOpen }: { rows: SageRequest[]; onOpen: (r: SageRequest) => void }) {
  const { ds, user, roles, refData, notify, upsertRequest } = useApp()
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const now = useMemo(() => new Date(), [])
  const lanes = useMemo(() => statusCounts(rows, refData.statuses), [rows, refData.statuses])

  // A drop is a triage save with only the status changed, so every rule that
  // guards the triage form guards the board too.
  const move = async (r: SageRequest, status: string) => {
    if (r.requestStatus?.value === status) return
    const plan = planTriageSave(r, { ...initialTriageForm(r), status }, roles, user, refData, new Date())
    if (!plan.ok) return notify('error', `${r.title} was not moved. ${plan.error}`)
    setBusy(r.id)
    try {
      upsertRequest(await ds.updateRequest(r.id, plan.patch))
      notify('success', `${r.title} moved to ${status}.`)
    } catch (e) {
      notify('error', `${r.title} was not moved: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="board fill">
      {lanes.map((lane) => {
        const cards = rows.filter((r) => r.requestStatus?.value === lane.status)
        return (
          <section
            key={lane.status}
            className={`board-lane${over === lane.status ? ' over' : ''}`}
            aria-label={`${lane.status}, ${cards.length}`}
            onDragOver={(e) => {
              if (dragId === null) return
              e.preventDefault()
              setOver(lane.status)
            }}
            onDragLeave={() => setOver((o) => (o === lane.status ? '' : o))}
            onDrop={(e) => {
              e.preventDefault()
              setOver('')
              const r = rows.find((x) => x.id === dragId)
              setDragId(null)
              if (r) void move(r, lane.status)
            }}
          >
            <h2 className={`board-head tone-${toneOf(lane.status)}`}>
              <span className="badge-dot" aria-hidden="true" />
              {lane.status}
              <span className="board-count">{cards.length}</span>
            </h2>
            {cards.map((r) => (
              <button
                key={r.id}
                className={`card${busy === r.id ? ' busy' : ''}`}
                draggable={roles.canTriage}
                onDragStart={(e) => {
                  setDragId(r.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOver('')
                }}
                onClick={() => onOpen(r)}
              >
                <span className="card-top">
                  <RequestTag id={r.title} />
                  <span className="muted">{ageLabel(ageDays(r, now))}</span>
                </span>
                <span className="card-title">{summaryOf(r)}</span>
                <span className="card-meta">
                  <span>{r.requestType?.value}</span>
                  <span>{r.priority?.value}</span>
                  <RxTag area={r.businessArea} />
                </span>
                <span className="muted">{r.requesterName}</span>
              </button>
            ))}
            {cards.length === 0 && <p className="board-empty">Nothing here</p>}
          </section>
        )
      })}
    </div>
  )
}

export function Requests() {
  const { roles, refData, requests, comments } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mySide = roles.canTriage ? 'admin' : 'requester'
  const columns = useMemo(() => {
    const rows = requests.state === 'ready' ? requests.rows : []
    return buildColumns(new Set(rows.filter((r) => waitingOn(r, comments) === mySide).map((r) => r.id)))
  }, [requests, comments, mySide])
  const f = {
    status: params.get('status') ?? '',
    team: params.get('team') ?? '',
    type: params.get('type') ?? '',
    ddat: params.get('ddat') ?? '',
    area: params.get('area') ?? '',
  }
  const q = params.get('q') ?? ''
  const view = params.get('view') === 'board' ? 'board' : 'table'
  // Filters live in the URL, so a filtered list can be bookmarked or shared.
  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const all = requests.state === 'ready' ? requests.rows : NONE
  const { team, type, ddat, area } = f
  const scoped = useMemo(() => filterRequests(all, { status: '', team, type, ddat, area }), [all, team, type, ddat, area])
  const rows = useMemo(() => (f.status ? scoped.filter((r) => r.requestStatus?.value === f.status) : scoped), [scoped, f.status])
  const tabs = useMemo(() => statusCounts(scoped, refData.statuses), [scoped, refData.statuses])
  const boardRows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? scoped.filter((r) => `${r.title} ${r.requesterName} ${summaryOf(r)}`.toLowerCase().includes(t)) : scoped
  }, [scoped, q])
  const open = (r: SageRequest) => navigate(`/requests/${r.id}`)
  const filtered = anyRequestFilter(f) || q !== ''

  const exportCsv = () => {
    const csv = toCsv(
      ['Request', 'Subject', 'Requester', 'Business team', 'Type', 'Business area', 'Priority', 'Submitted', 'Completed', 'Status'],
      rows.map((r) => [
        r.title,
        summaryOf(r),
        r.requesterName,
        r.businessTeam?.value ?? '',
        r.requestType?.value ?? '',
        r.businessArea,
        r.priority?.value ?? '',
        fmtDate(r.created),
        fmtDate(r.completionDate),
        r.requestStatus?.value ?? '',
      ]),
    )
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sage-requests.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>{roles.canTriage ? 'All requests' : 'My requests'}</h1>
          {roles.myDomain && !roles.isSageAdmin && <p className="muted">You triage as {roles.myDomain} admin</p>}
        </div>
        <Link to="/new" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          New request
        </Link>
      </header>

      <div className="toolbar">
        <label className="searchbox">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search ID, subject or requester" aria-label="Search requests" value={q} onChange={(e) => set('q', e.target.value)} />
        </label>
        <Select label="Business team" value={f.team} options={refData.teams.map((t) => t.title)} onChange={(v) => set('team', v)} placeholder="All teams" />
        <Select label="Request type" value={f.type} options={refData.requestTypes.map((t) => t.title)} onChange={(v) => set('type', v)} placeholder="All types" />
        <Select label="Business area" value={f.area} options={refData.choices.businessArea} onChange={(v) => set('area', v)} placeholder="FS or Rx" />
        {roles.canTriage && (
          <Select label="DDAT involvement" value={f.ddat} options={DDAT_FILTER_OPTIONS.slice(1)} onChange={(v) => set('ddat', v)} placeholder="With or without DDAT" />
        )}
        {filtered && (
          // keeps the table/board choice; clears search, the dropdowns and the status tab
          <button className="btn btn-quiet" onClick={() => setParams(view === 'board' ? { view: 'board' } : {}, { replace: true })}>
            <RotateCcw size={16} aria-hidden="true" /> Reset filters
          </button>
        )}
        <span className="toolbar-end">
          <span className="seg" role="group" aria-label="View">
            <button aria-pressed={view === 'table'} onClick={() => set('view', '')}>
              <Rows3 size={16} aria-hidden="true" /> Table
            </button>
            <button aria-pressed={view === 'board'} onClick={() => set('view', 'board')}>
              <Columns3 size={16} aria-hidden="true" /> Board
            </button>
          </span>
          <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        </span>
      </div>

      {requests.state === 'loading' && (
        <section className="panel">
          <SkeletonRows rows={8} />
        </section>
      )}
      {requests.state === 'error' && (
        <section className="panel">
          <Empty title="Requests could not be loaded">{requests.message}</Empty>
        </section>
      )}

      {requests.state === 'ready' && view === 'table' && (
        <section className="panel panel-flush fill">
          <div className="tabs" role="group" aria-label="Status">
            <button aria-pressed={f.status === ''} onClick={() => set('status', '')}>
              All <span>{scoped.length}</span>
            </button>
            {tabs.map((t) => (
              <button key={t.status} aria-pressed={f.status === t.status} onClick={() => set('status', t.status)}>
                {t.status} <span>{t.count}</span>
              </button>
            ))}
          </div>
          <DataTable
            data={rows}
            columns={columns}
            search={q}
            onOpen={open}
            rowLabel={(r) => `Open ${r.title}`}
            initialSort={[{ id: 'created', desc: true }]}
            empty={
            <Empty
              title={filtered ? 'No requests match these filters' : 'No requests yet'}
              action={
                filtered ? (
                  <button className="btn" onClick={() => setParams({}, { replace: true })}>
                    Clear filters
                  </button>
                ) : (
                  <Link to="/new" className="btn btn-primary">
                    Start a request
                  </Link>
                )
              }
            />
            }
          />
        </section>
      )}

      {requests.state === 'ready' && view === 'board' && (
        <>
          {roles.canTriage && <p className="muted board-hint">Drag a card to another column to change its status. Completing or rejecting needs a resolution, so open the request for those.</p>}
          <Board rows={boardRows} onOpen={open} />
        </>
      )}
    </div>
  )
}
