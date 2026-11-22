import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Empty, RequestTag, Select, SkeletonRows, StatusBadge, toneOf } from '../components/ui'
import { REQUEST_TYPES } from '../domain/types'
import type { SageRequest } from '../domain/types'
import { summaryOf } from '../logic/details'
import { waitingOn } from '../logic/conversation'
import { fmtLongDate } from '../logic/format'
import { ageDays, ageLabel, inDomain, oldestOpen, statusCounts, triageInsights, weeklyIntake } from '../logic/stats'
import { draftStarted, useApp } from '../store'

const NONE: SageRequest[] = []
const TYPE_FILL = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']

/** Height of one waiting-list row, matching `.rowlist a` in the stylesheet. */
const ROW_H = 60

const REEL = Array.from({ length: 20 }, (_, i) => i % 10)

/** Odometer: each digit is a reel that spins a full turn and settles on its value. */
function RollingNumber({ value }: { value: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const digits = String(value).split('')
  return (
    <span className="roll" role="img" aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="roll-col" aria-hidden="true">
          <span
            className="roll-reel"
            style={{ transform: `translateY(-${on ? (10 + Number(d)) * 5 : 0}%)`, transitionDelay: `${150 + i * 140}ms` }}
          >
            {REEL.map((n, j) => (
              <span key={j}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

export function Home() {
  const [hot, setHot] = useState('')
  const { user, roles, refData, requests, draft, resetDraft, comments } = useApp()
  const now = useMemo(() => new Date(), [])
  const all = requests.state === 'ready' ? requests.rows : NONE
  // A domain admin lands on their own domain; a SAGE admin on everything. Either can switch.
  const [domain, setDomain] = useState(roles.myDomain && !roles.isSageAdmin ? roles.myDomain : '')
  const rows = useMemo(() => inDomain(all, roles.canTriage ? domain : ''), [all, domain, roles.canTriage])
  const insights = useMemo(() => triageInsights(rows, now), [rows, now])
  // Conversations where the next reply is owed by the person looking at this page.
  const owed = useMemo(() => rows.filter((r) => waitingOn(r, comments) === (roles.canTriage ? 'admin' : 'requester')), [rows, comments, roles.canTriage])
  const teamQ = domain ? `team=${encodeURIComponent(domain)}` : ''
  const counts = useMemo(() => statusCounts(rows, refData.statuses), [rows, refData.statuses])
  // Show as many waiting rows as the card has room for, so the overview never needs to scroll.
  const listBox = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(4)
  useEffect(() => {
    const el = listBox.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setFit(Math.max(1, Math.floor(el.clientHeight / ROW_H)))
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  })
  const waitingAll = useMemo(() => oldestOpen(rows, 50), [rows])
  const waiting = waitingAll.slice(0, fit)
  const weekly = useMemo(() => weeklyIntake(rows, 8, now), [rows, now])
  const total = rows.length
  const first = user.fullName.trim().split(/\s+/)[0] || user.fullName

  return (
    <div className="page page-home">
      <header className="page-head">
        <div>
          <h1>Hello, {first}</h1>
          <p className="muted">{fmtLongDate(now)}</p>
        </div>
        <Link to="/new" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          New request
        </Link>
      </header>

      {draftStarted(draft) && (
        <div className="notice">
          <span>
            You have an unfinished {draft.requestType ? draft.requestType.toLowerCase() : 'request'} saved on this device.
          </span>
          <span className="notice-actions">
            <button className="btn btn-quiet" onClick={resetDraft}>
              Discard draft
            </button>
            <Link to="/new" className="btn">
              Continue draft
            </Link>
          </span>
        </div>
      )}

      {!roles.canTriage && owed.length > 0 && (
        <div className="notice">
          <span>
            The analytics team asked a question on {owed.length === 1 ? owed[0].title : `${owed.length} of your requests`}. They are waiting for your reply.
          </span>
          <Link to={`/requests/${owed[0].id}`} className="btn">
            Read and reply
          </Link>
        </div>
      )}

      {requests.state === 'loading' && (
        <section className="panel">
          <SkeletonRows rows={4} />
        </section>
      )}
      {requests.state === 'error' && (
        <section className="panel">
          <Empty title="Requests could not be loaded">{requests.message}</Empty>
        </section>
      )}

      {requests.state === 'ready' && all.length === 0 && (
        <section className="panel">
          <Empty
            title="No requests yet"
            action={
              <Link to="/new" className="btn btn-primary">
                Start a request
              </Link>
            }
          >
            Report an incident, ask for a data extract, or propose a new report or an enhancement.
          </Empty>
        </section>
      )}

      {requests.state === 'ready' && all.length > 0 && (
        <>
          <section className="panel" aria-labelledby="standing">
            <div className="panel-head">
              <h2 id="standing">Where everything stands</h2>
              {roles.canTriage ? (
                <span className="scope">
                  <Select label="Domain" value={domain} options={refData.teams.map((t) => t.title)} onChange={setDomain} placeholder="All domains" />
                  {roles.myDomain && domain !== roles.myDomain && (
                    <button className="link" onClick={() => setDomain(roles.myDomain)}>
                      Back to my domain
                    </button>
                  )}
                </span>
              ) : (
                <span className="muted">The requests you have submitted</span>
              )}
            </div>
            {total === 0 && <p className="muted">No requests have come in for {domain} yet.</p>}
            <div className="lanes" role="img" aria-label={counts.map((c) => `${c.count} ${c.status}`).join(', ')}>
              {counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <span key={c.status} className={`lane tone-${toneOf(c.status)}${hot && hot !== c.status ? ' dim' : ''}`} style={{ flexGrow: c.count }} />
                ))}
            </div>
            <ul className="lane-legend">
              {counts.map((c) => (
                <li key={c.status}>
                  <Link
                    to={`/requests?status=${encodeURIComponent(c.status)}${teamQ ? `&${teamQ}` : ''}`}
                    className={`lane-key tone-${toneOf(c.status)}`}
                    onMouseEnter={() => setHot(c.status)}
                    onMouseLeave={() => setHot('')}
                    onFocus={() => setHot(c.status)}
                    onBlur={() => setHot('')}
                  >
                    <span className="lane-num">
                      <RollingNumber value={c.count} />
                    </span>
                    <span className="lane-name">
                      <span className="badge-dot" aria-hidden="true" />
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {roles.canTriage && (
            <section className="tiles" aria-label={domain ? `${domain} at a glance` : 'All domains at a glance'}>
              <div className="tile">
                <span className="tile-num">{insights.open}</span>
                <span className="tile-name">Open</span>
              </div>
              <div className={`tile${insights.unassigned ? ' tile-flag' : ''}`}>
                <span className="tile-num">{insights.unassigned}</span>
                <span className="tile-name">Unassigned</span>
              </div>
              <div className={`tile${owed.length ? ' tile-flag' : ''}`}>
                <span className="tile-num">{owed.length}</span>
                <span className="tile-name">Requester replied</span>
              </div>
              <div className="tile">
                <span className="tile-num">{insights.waitingOnDdat}</span>
                <span className="tile-name">Waiting on DDAT</span>
              </div>
              <div className="tile">
                <span className="tile-num">{insights.oldestOpenDays === null ? 'None' : ageLabel(insights.oldestOpenDays)}</span>
                <span className="tile-name">Oldest open</span>
              </div>
            </section>
          )}

          <div className={`home-main${roles.canTriage ? ' split' : ''}`}>
            <section className="panel" aria-labelledby="waiting">
              <div className="panel-head">
                <h2 id="waiting">Waiting longest</h2>
                <Link to={`/requests${teamQ ? `?${teamQ}` : ''}`} className="link">
                  See all {total}
                </Link>
              </div>
              {waitingAll.length === 0 ? (
                <Empty title="Nothing is open">Every request has been completed or rejected.</Empty>
              ) : (
                <div className="rowlist-fit" ref={listBox}>
                <ul className="rowlist">
                  {waiting.map((r) => (
                    <li key={r.id}>
                      <Link to={`/requests/${r.id}`}>
                        <RequestTag id={r.title} />
                        <span className="rowlist-main">
                          <span className="rowlist-title">{summaryOf(r)}</span>
                          <span className="muted">
                            {r.requestType?.value}, from {r.requesterName}
                          </span>
                        </span>
                        <StatusBadge status={r.requestStatus?.value ?? ''} />
                        <span className="rowlist-age">{ageLabel(ageDays(r, now))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              )}
            </section>

            {roles.canTriage && (
              <section className="panel" aria-labelledby="intake">
                <div className="panel-head">
                  <h2 id="intake">New requests per week</h2>
                  <span className="muted">Last 8 weeks, by type</span>
                </div>
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: 'var(--hover)' }}
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }}
                      />
                      <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                      {REQUEST_TYPES.map((t, i) => (
                        <Bar key={t} dataKey={t} stackId="a" fill={TYPE_FILL[i]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}
