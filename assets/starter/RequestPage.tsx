import { ArrowLeft, Check, ExternalLink, Eye, Link2, Lock, Pause, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { Conversation } from '../components/Conversation'
import { Avatar, ChoiceCards, Empty, Field, RequestTag, RxTag, Select, SkeletonRows, StatusBadge } from '../components/ui'
import type { Person, SageRequest } from '../domain/types'
import { DDAT_STATUS, STATUS } from '../domain/types'
import { detailRows, summaryOf, viewOfRequest } from '../logic/details'
import { blank, coalesce, fmtDate } from '../logic/format'
import { waitingOn } from '../logic/conversation'
import { dcOpsName } from '../logic/intake'
import { activityEntries, closing, initialTriageForm, isCompleted, isEscalated, planTriageSave, statusOptions } from '../logic/triage'
import type { TriageForm } from '../logic/triage'
import { useApp } from '../store'

const isHttp = (s: string) => /^https?:\/\//i.test(s.trim())

/* ---------- shared pieces ---------- */

interface Step {
  label: string
  note?: string
}
/** A fixed sequence with one current step. `state` says how the current step is doing. */
function Tracker({ steps, current, state, label }: { steps: Step[]; current: number; state: 'active' | 'waiting' | 'paused' | 'stopped' | 'done'; label: string }) {
  return (
    <ol className="tracker" aria-label={label}>
      {steps.map((s, i) => {
        const done = i < current || state === 'done'
        const cls = done ? 'done' : i === current ? `now ${state}` : ''
        return (
          <li key={s.label} className={cls} aria-current={i === current && state !== 'done' ? 'step' : undefined}>
            <span className="tracker-dot" aria-hidden="true">
              {done ? <Check size={14} /> : i === current && state === 'paused' ? <Pause size={12} /> : i === current && state === 'stopped' ? <X size={14} /> : null}
            </span>
            <span className="tracker-label">{s.label}</span>
            {s.note && <span className="tracker-note">{s.note}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function PeoplePicker({ id, value, onChange, disabled }: { id: string; value: Person | null; onChange: (p: Person | null) => void; disabled?: boolean }) {
  const { ds } = useApp()
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const seq = useRef(0)
  useEffect(() => {
    if (!open || term.trim().length < 2) return setHits([])
    const mine = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await ds.searchUsers(term)
        if (mine === seq.current) setHits(r)
      } catch {
        if (mine === seq.current) setHits([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [term, open, ds])
  if (value)
    return (
      <div className="input person">
        <Avatar name={value.displayName || value.email} />
        <span>{value.displayName || value.email}</span>
        {!disabled && (
          <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label={`Remove ${value.displayName}`}>
            <X size={16} />
          </button>
        )}
      </div>
    )
  return (
    <div className="combo">
      <input
        id={id}
        className="input"
        placeholder="Search by name"
        autoComplete="off"
        value={term}
        disabled={disabled}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && hits.length > 0 && (
        <div className="combo-pop">
          {hits.map((p) => (
            <button
              type="button"
              key={p.email}
              onMouseDown={() => {
                onChange(p)
                setTerm('')
                setOpen(false)
              }}
            >
              <Avatar name={p.displayName} />
              <span>
                {p.displayName}
                <small>{p.email}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Free-text answers. Everything else on a request is a short fact. */
const LONG_FIELDS = new Set(['What data', 'Business justification', 'Issue', 'Business impact', 'Requirements', 'Enhancement requested'])

/** A long answer: readable line length, folded past ~8 lines with a way to open it. */
function LongText({ label, text }: { label: string; text: string }) {
  const body = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [folds, setFolds] = useState(false)
  useLayoutEffect(() => {
    const el = body.current
    if (el && !open) setFolds(el.scrollHeight > el.clientHeight + 1)
  }, [text, open])
  const words = text.trim().split(/\s+/).length
  return (
    <section className="longtext">
      <h3>{label}</h3>
      <p ref={body} className={`pre longtext-body${open ? '' : ' folded'}${folds && !open ? ' fades' : ''}`}>
        {text}
      </p>
      {(folds || open) && (
        <button className="link longtext-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : `Show all ${words} words`}
        </button>
      )}
    </section>
  )
}

/** The request body: long answers as reading blocks, short ones as a fact grid, blanks named in one line. */
function Asked({ r, heading }: { r: SageRequest; heading: string }) {
  const rows = detailRows(viewOfRequest(r))
  const given = rows.filter((row) => row.value !== '-')
  const long = given.filter((row) => LONG_FIELDS.has(row.label))
  const short = given.filter((row) => !LONG_FIELDS.has(row.label))
  const blankLabels = rows.filter((row) => row.value === '-').map((row) => row.label)
  return (
    <section className="panel" aria-labelledby="asked">
      <h2 id="asked">{heading}</h2>
      {short.length > 0 && (
        <dl className="facts facts-row">
          {short.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {long.map((row) => (
        <LongText key={row.label} label={row.label} text={row.value} />
      ))}
      {blankLabels.length > 0 && <p className="muted left-blank">Left blank: {blankLabels.join(', ')}</p>}
    </section>
  )
}

function AtAGlance({ r }: { r: SageRequest }) {
  const { refData } = useApp()
  const view = viewOfRequest(r)
  const isDcOps = view.businessTeam === dcOpsName(refData)
  return (
    <section className="panel panel-tight" aria-labelledby="glance">
      <h2 id="glance">At a glance</h2>
      <dl className="facts glance">
        <div><dt>Type</dt><dd>{view.requestType}</dd></div>
        <div><dt>Business area</dt><dd>{coalesce(view.businessArea, 'Not given')}</dd></div>
        <div><dt>Priority</dt><dd>{coalesce(view.priority, 'Not set')}</dd></div>
        <div><dt>Submitted</dt><dd>{fmtDate(r.created)}</dd></div>
        <div><dt>Handled by</dt><dd>{r.assignedTo?.displayName || 'Not assigned yet'}</dd></div>
        <div><dt>Requester</dt><dd>{view.requesterName}</dd></div>
        <div><dt>Email</dt><dd>{view.requesterEmail}</dd></div>
        <div><dt>Requesting from</dt><dd>{view.businessTeam}</dd></div>
        <div><dt>{isDcOps ? 'Distribution center' : 'Team'}</dt><dd>{coalesce(isDcOps ? view.dc : view.teamName, 'Not given')}</dd></div>
      </dl>
    </section>
  )
}

/* ---------- 1. What the requester sees ---------- */

function requesterProgress(r: SageRequest): { steps: Step[]; current: number; state: 'active' | 'waiting' | 'paused' | 'stopped' | 'done'; line: string } {
  const status = r.requestStatus?.value ?? ''
  const submitted: Step = { label: 'Submitted', note: fmtDate(r.created) }
  const who = r.assignedTo?.displayName
  const full = (third: string): Step[] => [submitted, { label: 'In review' }, { label: third }, { label: 'Completed', note: fmtDate(r.completionDate) || undefined }]
  switch (status) {
    case STATUS.notStarted:
      return { steps: full('Not started'), current: 2, state: 'waiting', line: `Reviewed and accepted${who ? `, and assigned to ${who}` : ''}. Work has not started yet.` }
    case STATUS.inProgress:
      return { steps: full('In progress'), current: 2, state: 'active', line: who ? `${who} is working on this.` : 'The analytics team is working on this.' }
    case STATUS.onHold:
      return { steps: full('On hold'), current: 2, state: 'paused', line: 'Work is paused for now. Nothing is needed from you unless the team gets in touch.' }
    case STATUS.completed:
      return { steps: full('In progress'), current: 3, state: 'done', line: `Completed${r.completionDate ? ` on ${fmtDate(r.completionDate)}` : ''}. The outcome is below.` }
    case STATUS.rejected:
      return { steps: [submitted, { label: 'In review' }, { label: 'Not taken on' }], current: 2, state: 'stopped', line: 'This request was not taken on. The reason is below.' }
    default:
      return { steps: full('In progress'), current: 1, state: 'active', line: 'Waiting for a domain admin to review it. You do not need to do anything.' }
  }
}

function RequesterView({ r }: { r: SageRequest }) {
  const p = requesterProgress(r)
  const hasResolution = !blank(r.resolution) || !blank(r.resolutionLink)
  return (
    <div className="req-grid fill">
      <div className="req-main">
      <section className="panel" aria-labelledby="progress">
        <h2 id="progress">Where it stands</h2>
        <Tracker steps={p.steps} current={p.current} state={p.state} label="Request progress" />
        <p className="tracker-line">{p.line}</p>
      </section>

      <Conversation r={r} as="requester" />

      {hasResolution && (
        <section className={`panel resolution${r.requestStatus?.value === STATUS.rejected ? ' resolution-no' : ''}`} aria-labelledby="res">
          <h2 id="res">{r.requestStatus?.value === STATUS.rejected ? 'Why it was not taken on' : 'Outcome'}</h2>
          {!blank(r.resolution) && <p className="pre">{r.resolution}</p>}
          {isHttp(r.resolutionLink) ? (
            <a className="btn" href={r.resolutionLink} target="_blank" rel="noopener noreferrer">
              Open the report or tool <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            !blank(r.resolutionLink) && <p>{r.resolutionLink}</p>
          )}
        </section>
      )}

      <Asked r={r} heading="What you asked for" />
      </div>
      <aside className="req-side">
        <AtAGlance r={r} />
      </aside>
    </div>
  )
}

/* ---------- 2. Domain admin triage ---------- */

type TriagePart = Pick<TriageForm, 'status' | 'domain' | 'businessArea' | 'assignee' | 'resolution' | 'resolutionLink' | 'comment'>

function TriageView({ r, f, set, locked, busy, onSave }: { r: SageRequest; f: TriagePart; set: (p: Partial<TriagePart>) => void; locked: boolean; busy: boolean; onSave: () => void }) {
  const { refData } = useApp()
  const escalated = isEscalated(r)
  const canClose = closing(f.status) && !locked
  const statuses = statusOptions(refData.statuses, r, escalated).map((s) => ({ value: s.title }))
  const completedWithheld = escalated && !statuses.some((s) => s.value === STATUS.completed)
  return (
    <div className="tri fill">
      <div className="tri-main">
      <aside className="tri-side">
        <Asked r={r} heading="The ask" />
        <AtAGlance r={r} />
        <section className="panel panel-tight" aria-labelledby="ddat-short">
          <h2 id="ddat-short">DDAT</h2>
          {escalated ? (
            <p>
              <StatusBadge status={coalesce(r.ddatStatus, DDAT_STATUS.requested)} />
            </p>
          ) : (
            <p className="muted">Not involved.</p>
          )}
          <Link to={`/requests/${r.id}/ddat`} className="link">
            {escalated ? 'See the hand-off' : 'Hand off to DDAT'}
          </Link>
        </section>
      </aside>
      <section className="panel tri-form" aria-label="Triage">
        {locked && (
          <p className="locked">
            <Lock size={16} aria-hidden="true" /> Completed requests can no longer be edited.
          </p>
        )}
        <fieldset className="form-plain" disabled={locked}>
          <ChoiceCards
            legend="Status"
            required={false}
            columns={3}
            hint={completedWithheld ? 'Completed is unavailable until DDAT delivers or rejects.' : undefined}
            options={statuses}
            value={f.status}
            onChange={(v) => set({ status: v })}
          />
          {canClose && (
            <div className="closing">
              <Field label={f.status === STATUS.rejected ? 'Why it is rejected' : 'Resolution'} required hint="The requester sees this.">
                {(id, d) => <textarea id={id} aria-describedby={d} className="input area" placeholder="In the requester's terms" value={f.resolution} onChange={(e) => set({ resolution: e.target.value })} />}
              </Field>
              <Field label="Link to the report or tool">
                {(id) => <input id={id} className="input" placeholder="https://" value={f.resolutionLink} onChange={(e) => set({ resolutionLink: e.target.value })} />}
              </Field>
            </div>
          )}
          <div className="grid-2">
            <Field label="Assigned to">{(id) => <PeoplePicker id={id} value={f.assignee} onChange={(p) => set({ assignee: p })} disabled={locked} />}</Field>
            <Field label="Owning domain" hint="Changing this re-queues the request under the new domain. The request ID keeps its team code.">
              {(id) => <Select id={id} value={f.domain} options={refData.teams.map((t) => t.title)} onChange={(v) => set({ domain: v })} />}
            </Field>
            <Field label="Business area" hint={r.businessArea ? `The requester chose ${r.businessArea}. Correct it here if that is wrong.` : 'Not asked when this request was filed. Set it if you know.'}>
              {(id, d) => (
                <select id={id} aria-describedby={d} className="input" value={f.businessArea} onChange={(e) => set({ businessArea: e.target.value })}>
                  {!r.businessArea && <option value="">Not given</option>}
                  {refData.choices.businessArea.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label="Internal comment" hint="Goes on the activity thread. The requester never sees it.">
            {(id, d) => <textarea id={id} aria-describedby={d} className="input area" value={f.comment} onChange={(e) => set({ comment: e.target.value })} />}
          </Field>
        </fieldset>
        {!locked && (
          <div className="form-actions">
            <button className="btn btn-primary" onClick={onSave} disabled={busy}>
              {busy ? 'Saving' : 'Save triage'}
            </button>
          </div>
        )}
      </section>

      </div>
      <Conversation r={r} as="admin" fill />
    </div>
  )
}

/* ---------- 3. DDAT hand-off ---------- */

interface DdatPart {
  ddatPriority: string
  ddatAsk: string
}

function ddatProgress(r: SageRequest): { steps: Step[]; current: number; state: 'active' | 'stopped' | 'done' } {
  const stage = coalesce(r.ddatStatus, DDAT_STATUS.requested)
  if (stage === DDAT_STATUS.rejected) return { steps: [{ label: 'Requested' }, { label: 'Rejected by DDAT' }], current: 1, state: 'stopped' }
  const steps: Step[] = [{ label: 'Requested' }, { label: 'Accepted' }, { label: 'Delivered', note: fmtDate(r.ddatDeliveredDate) || undefined }]
  if (stage === DDAT_STATUS.delivered) return { steps, current: 2, state: 'done' }
  return { steps, current: stage === DDAT_STATUS.accepted ? 1 : 0, state: 'active' }
}

function DdatView({ r, f, set, locked, busy, onSave }: { r: SageRequest; f: DdatPart; set: (p: Partial<DdatPart>) => void; locked: boolean; busy: boolean; onSave: () => void }) {
  const { refData, roles } = useApp()
  const escalated = isEscalated(r)

  if (!escalated)
    return (
      <div className="req-single fill">
        <section className="panel" aria-labelledby="handoff">
          <h2 id="handoff">Hand this request to DDAT</h2>
          <p className="muted measure">
            Use this when the work needs Data Science or Data Engineering. You stay the owner and close the request yourself once DDAT delivers. A hand-off cannot be withdrawn; only
            DDAT can end it.
          </p>
          {locked ? (
            <p className="locked">
              <Lock size={16} aria-hidden="true" /> Completed requests can no longer be handed off.
            </p>
          ) : (
            <>
              <Field label="DDAT priority" required>
                {(id) => <Select id={id} value={f.ddatPriority} options={refData.choices.ddatPriority} onChange={(v) => set({ ddatPriority: v })} />}
              </Field>
              <Field label="What you need from DDAT" required hint="DDAT works from this, not from the original request.">
                {(id, d) => <textarea id={id} aria-describedby={d} className="input area" placeholder="What should DDAT actually do?" value={f.ddatAsk} onChange={(e) => set({ ddatAsk: e.target.value })} />}
              </Field>
              {(r.requestStatus?.value === STATUS.pending || r.requestStatus?.value === STATUS.notStarted) && <p className="muted">Sending this also moves the request to In Progress.</p>}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={onSave} disabled={busy}>
                  {busy ? 'Sending' : 'Send to DDAT'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )

  const p = ddatProgress(r)
  const askChanged = f.ddatAsk !== r.ddatAsk
  return (
    <div className="req-single fill">
      <section className="panel" aria-labelledby="ddat-progress">
        <div className="panel-head">
          <h2 id="ddat-progress">With DDAT</h2>
          {roles.canSeeDdatQueue && (
            <Link to={`/ddat/${r.id}`} className="link">
              Open in the DDAT queue
            </Link>
          )}
        </div>
        <Tracker steps={p.steps} current={p.current} state={p.state} label="DDAT progress" />
        <p className="tracker-line">
          {p.state === 'done'
            ? 'DDAT has delivered. You can now complete the request from the Triage tab.'
            : p.state === 'stopped'
              ? 'DDAT rejected this hand-off. Their note is on the activity thread. You can still close the request yourself.'
              : 'DDAT owns this part. The request cannot be completed until they deliver or reject.'}
        </p>
        <dl className="facts facts-row">
          <div><dt>Priority</dt><dd>{coalesce(r.ddatPriority, 'Not set')}</dd></div>
          <div><dt>Sub-team</dt><dd>{coalesce(r.ddatSubTeam, 'Not assigned yet')}</dd></div>
          <div><dt>Assigned to</dt><dd>{coalesce(r.ddatAssignedTo, 'Nobody yet')}</dd></div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="ddat-ask">
        <h2 id="ddat-ask">What DDAT was asked to do</h2>
        <Field label="The ask" hint="You can refine this. Priority, sub-team and assignee are DDAT's to set.">
          {(id, d) => <textarea id={id} aria-describedby={d} className="input area" value={f.ddatAsk} disabled={locked} onChange={(e) => set({ ddatAsk: e.target.value })} />}
        </Field>
        {!locked && (
          <div className="form-actions">
            <button className="btn btn-primary" onClick={onSave} disabled={busy || !askChanged}>
              {busy ? 'Saving' : 'Update the ask'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- Activity ---------- */

/** "11/03/2026 09:14 · Dana Domain · Status → In Progress" plus optional note lines. */
function parseEntry(entry: string) {
  const [head, ...note] = entry.split('\n')
  const [stamp, who, ...rest] = head.split(' · ')
  return rest.length ? { stamp, who, changes: rest, note: note.join('\n') } : { stamp: '', who: '', changes: [head], note: note.join('\n') }
}

function ActivityView({ r }: { r: SageRequest }) {
  const entries = activityEntries(r.comment).map(parseEntry)
  return (
    <div className="req-single fill">
      <section className="panel" aria-labelledby="activity">
        <div className="panel-head">
          <h2 id="activity">Activity</h2>
          <span className="muted">Internal, newest first</span>
        </div>
        {entries.length === 0 ? (
          <p className="muted">No activity yet. Saving a change or a comment starts the thread.</p>
        ) : (
          <ol className="timeline">
            {entries.map((e, i) => (
              <li key={i}>
                <div className="timeline-head">
                  <strong>{e.who || 'Entry'}</strong>
                  <span className="muted">{e.stamp}</span>
                </div>
                <ul className="timeline-changes">
                  {e.changes.map((c, j) => (
                    <li key={j}>{c}</li>
                  ))}
                </ul>
                {e.note && <p className="pre timeline-note">{e.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

/* ---------- Page ---------- */

const triagePart = (r: SageRequest): TriagePart => {
  const f = initialTriageForm(r)
  return { status: f.status, domain: f.domain, businessArea: f.businessArea, assignee: f.assignee, resolution: f.resolution, resolutionLink: f.resolutionLink, comment: '' }
}
const ddatPart = (r: SageRequest): DdatPart => ({ ddatPriority: r.ddatPriority, ddatAsk: r.ddatAsk })

export function RequestPage() {
  const { id, tab } = useParams()
  const { ds, user, refData, roles, notify, upsertRequest, comments } = useApp()
  const [load, setLoad] = useState<{ state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; r: SageRequest }>({ state: 'loading' })
  const [triage, setTriage] = useState<TriagePart | null>(null)
  const [ddat, setDdat] = useState<DdatPart | null>(null)
  const [busy, setBusy] = useState(false)

  const adopt = (r: SageRequest) => {
    setLoad({ state: 'ready', r })
    setTriage(triagePart(r))
    setDdat(ddatPart(r))
  }

  useEffect(() => {
    let live = true
    setLoad({ state: 'loading' })
    const n = Number(id)
    if (!Number.isInteger(n)) return setLoad({ state: 'error', message: 'This link does not point to a request.' })
    ds.getRequest(n)
      .then((r) => {
        if (!live) return
        // The list a requester sees is filtered on the server; a pasted link must not widen that.
        if (!roles.canTriage && r.requestorEmail.toLowerCase() !== user.email.toLowerCase())
          return setLoad({ state: 'error', message: 'You can only open requests you submitted.' })
        adopt(r)
      })
      .catch((e) => live && setLoad({ state: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      live = false
    }
  }, [ds, id, roles.canTriage, user.email])

  const r = load.state === 'ready' ? load.r : null
  const entryCount = useMemo(() => (r ? activityEntries(r.comment).length : 0), [r])
  const back = (
    <Link to="/requests" className="link back">
      <ArrowLeft size={16} aria-hidden="true" />
      {roles.canTriage ? 'All requests' : 'My requests'}
    </Link>
  )

  if (!r || !triage || !ddat)
    return (
      <div className="page">
        {back}
        <section className="panel">
          {load.state === 'loading' ? <SkeletonRows rows={6} /> : <Empty title="This request could not be opened">{load.state === 'error' ? load.message : ''}</Empty>}
        </section>
      </div>
    )

  const locked = isCompleted(r)
  const escalated = isEscalated(r)

  // Both saves go through planTriageSave, so the rules that guard one guard the other.
  const apply = async (form: TriageForm, done: (summary: string) => string) => {
    if (busy) return
    const plan = planTriageSave(r, form, roles, user, refData, new Date())
    if (!plan.ok) return notify('error', plan.error)
    setBusy(true)
    try {
      const saved = await ds.updateRequest(r.id, plan.patch)
      upsertRequest(saved)
      adopt(saved)
      notify('success', done(plan.summary))
    } catch (e) {
      notify('error', `Nothing was saved: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }
  const saveTriage = () => apply({ ...initialTriageForm(r), ...triage }, (s) => `Saved: ${s}.`)
  const saveDdat = () =>
    apply(
      {
        ...initialTriageForm(r),
        needDdat: true,
        ddatPriority: ddat.ddatPriority,
        ddatAsk: ddat.ddatAsk,
        // an ask-only edit still needs a line on the thread, or the save is refused as empty
        comment: escalated ? 'DDAT ask updated.' : '',
      },
      () => (escalated ? 'DDAT ask updated.' : `${r.title} sent to DDAT.`),
    )
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      notify('success', 'Link copied.')
    } catch {
      notify('warning', 'The link could not be copied. Copy it from the address bar.')
    }
  }

  const base = `/requests/${r.id}`
  const view = roles.canTriage ? (tab === 'request' || tab === 'ddat' || tab === 'activity' ? tab : 'triage') : 'request'
  const owes = waitingOn(r, comments)
  let body: ReactNode
  if (view === 'triage') body = <TriageView r={r} f={triage} set={(p) => setTriage((x) => (x ? { ...x, ...p } : x))} locked={locked} busy={busy} onSave={saveTriage} />
  else if (view === 'ddat') body = <DdatView r={r} f={ddat} set={(p) => setDdat((x) => (x ? { ...x, ...p } : x))} locked={locked} busy={busy} onSave={saveDdat} />
  else if (view === 'activity') body = <ActivityView r={r} />
  else body = <RequesterView r={r} />

  return (
    <div className="page page-wide">
      {back}
      <header className="req-head">
        <div className="req-head-top">
          <RequestTag id={coalesce(r.title, 'N/A')} />
          <StatusBadge status={r.requestStatus?.value ?? ''} />
          <RxTag area={r.businessArea} />
          <span className="muted">{r.requestType?.value}</span>
          <button className="btn btn-quiet req-copy" onClick={copyLink}>
            <Link2 size={16} aria-hidden="true" /> Copy link
          </button>
        </div>
        {/* The subject is shown in the ask below; the heading stays for screen readers and the page outline. */}
        <h1 className="sr-only">{summaryOf(r)}</h1>
      </header>

      {roles.canTriage && (
        <nav className="tabs page-tabs" aria-label="Request views">
          <NavLink to={base} end>
            Triage
            {owes === 'admin' && <span className="tab-dot" aria-label="The requester replied" />}
          </NavLink>
          <NavLink to={`${base}/ddat`}>
            DDAT hand-off
            {escalated && <span className="tab-dot" aria-label={`DDAT ${coalesce(r.ddatStatus, DDAT_STATUS.requested)}`} />}
          </NavLink>
          <NavLink to={`${base}/activity`}>
            Activity <span>{entryCount}</span>
          </NavLink>
          <NavLink to={`${base}/request`} className="tab-end">
            <Eye size={16} aria-hidden="true" /> Requester's view
          </NavLink>
        </nav>
      )}
      {roles.canTriage && view === 'request' && (
        <p className="as-requester">
          This is what {r.requesterName || 'the requester'} sees. Internal comments, ownership and DDAT are not shown here. To reply to them, use the conversation on the Triage tab.
        </p>
      )}

      {body}
    </div>
  )
}
