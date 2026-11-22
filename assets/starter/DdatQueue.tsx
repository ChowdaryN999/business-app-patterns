import type { ColumnDef } from '@tanstack/react-table'
import { RotateCcw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DataTable } from '../components/DataTable'
import { Empty, Field, RequestTag, RxTag, Select, Sheet, SkeletonRows, StatusBadge } from '../components/ui'
import type { SageRequest } from '../domain/types'
import { assigneesFor, initialDdatForm, planDdatSave } from '../logic/ddat'
import type { DdatForm } from '../logic/ddat'
import { filterDdat, noDdatFilters } from '../logic/filters'
import { coalesce, fmtDate } from '../logic/format'
import { useApp } from '../store'
import type { Load } from '../store'

function Ticket({ t, onClose, onSaved }: { t: SageRequest; onClose: () => void; onSaved: () => void }) {
  const { ds, user, roles, refData, notify } = useApp()
  const [f, setF] = useState<DdatForm>(() => initialDdatForm(t))
  const [busy, setBusy] = useState(false)
  const ro = !roles.canEditDdat
  const set = (p: Partial<DdatForm>) => setF((x) => ({ ...x, ...p }))
  const save = async () => {
    const plan = planDdatSave(t, f, roles, user, new Date())
    if (!plan.ok) return notify('error', plan.error)
    setBusy(true)
    try {
      await ds.updateRequest(t.id, plan.patch)
      notify('success', `Saved${plan.summary ? `: ${plan.summary}` : ''}.`)
      onSaved()
    } catch (e) {
      notify('error', `Nothing was saved: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      title={<RequestTag id={t.title} />}
      meta={`${t.requestType?.value ?? ''}, submitted ${fmtDate(t.created)}`}
      onClose={onClose}
      footer={
        ro ? (
          <span className="muted">Read-only. DDAT assigns and updates these fields.</span>
        ) : (
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving' : 'Save changes'}
          </button>
        )
      }
    >
      <section>
        <h3>What DDAT needs to do</h3>
        <p className="pre ask">{coalesce(t.ddatAsk, 'Nothing was written.')}</p>
      </section>
      <dl className="facts facts-row">
        <div><dt>Requester</dt><dd>{coalesce(t.requesterName, 'Unknown')}</dd></div>
        <div><dt>Domain</dt><dd>{coalesce(t.businessTeam?.value, 'Unknown')}</dd></div>
        <div><dt>Location or team</dt><dd>{coalesce(t.dc?.value, t.teamName, 'Not given')}</dd></div>
        <div><dt>Business area</dt><dd>{coalesce(t.businessArea, 'Not given')}</dd></div>
        <div><dt>Business priority</dt><dd>{coalesce(t.priority?.value, 'Not set')}</dd></div>
        <div><dt>Request status</dt><dd><StatusBadge status={t.requestStatus?.value ?? ''} /></dd></div>
      </dl>
      {roles.canTriage && (
        <Link to={`/requests/${t.id}`} className="link">
          Open the full request
        </Link>
      )}
      <fieldset className="form-group" disabled={ro}>
        <legend>Assignment</legend>
        <div className="grid-2">
          <Field label="DDAT priority">{(id) => <Select id={id} value={f.priority} options={refData.choices.ddatPriority} onChange={(v) => set({ priority: v })} />}</Field>
          <Field label="DDAT status">{(id) => <Select id={id} value={f.status} options={refData.choices.ddatStatus} onChange={(v) => set({ status: v })} />}</Field>
          {/* changing sub-team clears the assignee: the two lists do not overlap */}
          <Field label="Sub-team">{(id) => <Select id={id} value={f.subTeam} options={refData.choices.ddatSubTeam} onChange={(v) => set({ subTeam: v, assignedTo: '' })} />}</Field>
          <Field label="Assigned to" disabled={!f.subTeam} hint={f.subTeam ? undefined : 'Choose a sub-team first.'}>
            {(id, d) => (
              <select id={id} aria-describedby={d} className="input" value={f.assignedTo} disabled={!f.subTeam} onChange={(e) => set({ assignedTo: e.target.value })}>
                <option value="">Select</option>
                {assigneesFor(f.subTeam).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Note" hint="Required when rejecting. Goes on the internal activity thread.">
          {(id, d) => <textarea id={id} aria-describedby={d} className="input area" value={f.note} onChange={(e) => set({ note: e.target.value })} />}
        </Field>
      </fieldset>
    </Sheet>
  )
}

const columns: ColumnDef<SageRequest, unknown>[] = [
  { id: 'id', header: 'Request', accessorFn: (r) => r.title, cell: (c) => <span className="cell-tags"><RequestTag id={c.row.original.title} /><RxTag area={c.row.original.businessArea} /></span> },
  { id: 'ask', header: 'What DDAT needs to do', accessorFn: (r) => coalesce(r.ddatAsk, 'Nothing written'), cell: (c) => <span className="cell-clip">{c.getValue() as string}</span> },
  { id: 'domain', header: 'Domain', accessorFn: (r) => r.businessTeam?.value ?? '' },
  { id: 'type', header: 'Type', accessorFn: (r) => r.requestType?.value ?? '' },
  { id: 'priority', header: 'Priority', accessorFn: (r) => coalesce(r.ddatPriority, 'Not set') },
  { id: 'subteam', header: 'Sub-team', accessorFn: (r) => coalesce(r.ddatSubTeam, 'Unassigned') },
  { id: 'assignee', header: 'Assigned to', accessorFn: (r) => coalesce(r.ddatAssignedTo, 'Unassigned') },
  { id: 'status', header: 'DDAT status', accessorFn: (r) => coalesce(r.ddatStatus, 'Requested'), cell: (c) => <StatusBadge status={c.getValue() as string} /> },
]

export function DdatQueue() {
  const { ds, roles, refData, refreshRequests } = useApp()
  const navigate = useNavigate()
  const { id } = useParams()
  const [load, setLoad] = useState<Load<SageRequest[]>>({ state: 'loading' })
  const [f, setF] = useState(noDdatFilters)
  const [q, setQ] = useState('')

  const refresh = useCallback(() => {
    if (!roles.canSeeDdatQueue) return
    ds.listRequests({ ddatOnly: true })
      .then((rows) => setLoad({ state: 'ready', rows }))
      .catch((e) => setLoad({ state: 'error', message: e instanceof Error ? e.message : String(e) }))
  }, [ds, roles.canSeeDdatQueue])
  useEffect(refresh, [refresh])

  const rows = useMemo(() => (load.state === 'ready' ? filterDdat(load.rows, f) : []), [load, f])
  const open = load.state === 'ready' && id ? load.rows.find((r) => String(r.id) === id) : undefined
  const filtered = q !== '' || Object.values(f).some(Boolean)

  if (!roles.canSeeDdatQueue)
    return (
      <div className="page">
        <header className="page-head">
          <h1>DDAT queue</h1>
        </header>
        <section className="panel">
          <Empty title="This queue is for DDAT members and SAGE administrators">
            Your own requests, including any that were escalated to DDAT, are under My requests.
          </Empty>
        </section>
      </div>
    )

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>DDAT queue</h1>
          <p className="muted">{roles.canEditDdat ? 'Requests a domain admin has escalated to DDAT' : 'Read-only oversight of requests escalated to DDAT'}</p>
        </div>
      </header>

      <div className="toolbar">
        <label className="searchbox">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search ID, ask or assignee" aria-label="Search the queue" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select label="DDAT status" value={f.status} options={refData.choices.ddatStatus} onChange={(v) => setF({ ...f, status: v })} placeholder="All statuses" />
        <Select label="Sub-team" value={f.subTeam} options={refData.choices.ddatSubTeam} onChange={(v) => setF({ ...f, subTeam: v })} placeholder="All sub-teams" />
        <Select label="Priority" value={f.priority} options={refData.choices.ddatPriority} onChange={(v) => setF({ ...f, priority: v })} placeholder="All priorities" />
        <Select label="Request type" value={f.type} options={refData.requestTypes.map((t) => t.title)} onChange={(v) => setF({ ...f, type: v })} placeholder="All types" />
        <Select label="Domain" value={f.domain} options={refData.teams.map((t) => t.title)} onChange={(v) => setF({ ...f, domain: v })} placeholder="All domains" />
        {filtered && (
          <button
            className="btn btn-quiet"
            onClick={() => {
              setF(noDdatFilters)
              setQ('')
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> Reset filters
          </button>
        )}
      </div>

      <section className="panel panel-flush fill">
        {load.state === 'loading' && <SkeletonRows rows={6} />}
        {load.state === 'error' && <Empty title="The queue could not be loaded">{load.message}</Empty>}
        {load.state === 'ready' && (
          <DataTable
            data={rows}
            columns={columns}
            search={q}
            onOpen={(r) => navigate(`/ddat/${r.id}`)}
            rowLabel={(r) => `Open ${r.title}`}
            empty={
              <Empty
                title={filtered ? 'Nothing in the queue matches these filters' : 'Nothing has been escalated to DDAT'}
                action={
                  filtered ? (
                    <button
                      className="btn"
                      onClick={() => {
                        setF(noDdatFilters)
                        setQ('')
                      }}
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </section>

      {open && (
        <Ticket
          key={open.id}
          t={open}
          onClose={() => navigate('/ddat')}
          onSaved={() => {
            navigate('/ddat')
            refresh()
            void refreshRequests()
          }}
        />
      )}
    </div>
  )
}
