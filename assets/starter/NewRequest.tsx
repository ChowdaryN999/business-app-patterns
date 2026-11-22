import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChipSelect, ChoiceCards, Dialog, Field, Select } from '../components/ui'
import type { Draft } from '../domain/types'
import { detailRows, viewOfDraft } from '../logic/details'
import { blank } from '../logic/format'
import { dcOpsName, missingDetailFields, stage1Complete, SubmitError, submitNewRequest } from '../logic/intake'
import { draftStarted, useApp } from '../store'

type Set = (patch: Partial<Draft>) => void
interface FieldProps {
  label: string
  k: keyof Draft
  d: Draft
  set: Set
  missing: string[]
  required?: boolean
  placeholder?: string
}
const errFor = (label: string, missing: string[]) => (missing.includes(label) ? 'Fill this in to continue.' : undefined)

function Text({ label, k, d, set, missing, required, placeholder }: FieldProps) {
  return (
    <Field label={label} required={required} error={errFor(label, missing)}>
      {(id, desc) => (
        <input id={id} aria-describedby={desc} className="input" maxLength={255} value={d[k] as string} placeholder={placeholder} onChange={(e) => set({ [k]: e.target.value })} />
      )}
    </Field>
  )
}
function Area({ label, k, d, set, missing, required, placeholder }: FieldProps) {
  return (
    <Field label={label} required={required} error={errFor(label, missing)}>
      {(id, desc) => <textarea id={id} aria-describedby={desc} className="input area" value={d[k] as string} placeholder={placeholder} onChange={(e) => set({ [k]: e.target.value })} />}
    </Field>
  )
}

function Platforms({ d, set }: { d: Draft; set: Set }) {
  const { refData } = useApp()
  return (
    <ChipSelect
      label="Platforms"
      options={refData.platforms.map((p) => p.title)}
      value={d.platform.map((p) => p.value)}
      onChange={(titles) => set({ platform: refData.platforms.filter((p) => titles.includes(p.title)).map((p) => ({ id: p.id, value: p.title })) })}
    />
  )
}

function TypeFields({ d, set, missing }: { d: Draft; set: Set; missing: string[] }) {
  const { choices } = useApp().refData
  const p = { d, set, missing }
  switch (d.requestType) {
    case 'Data Extract':
      return (
        <>
          <Area {...p} label="What data do you need?" k="whatData" required placeholder="Describe the fields, tables, or report data you need" />
          <Area {...p} label="Business Justification" k="businessJustification" required placeholder="Why is this data needed and how will it be used?" />
          <ChipSelect label="Source system" options={choices.sourceSystem} value={d.sourceSystem} onChange={(v) => set({ sourceSystem: v })} />
          <Text {...p} label="Date range" k="dateRange" placeholder="For example Jan 2024 to Dec 2024" />
          <div className="grid-2">
            <Field label="File format">{(id) => <Select id={id} value={d.fileFormat} options={choices.fileFormat} onChange={(v) => set({ fileFormat: v })} />}</Field>
            <Field label="Frequency">{(id) => <Select id={id} value={d.frequency} options={choices.frequency} onChange={(v) => set({ frequency: v })} />}</Field>
          </div>
        </>
      )
    case 'Incident':
      return (
        <>
          <Text {...p} label="Product(s) with issues" k="toolAffected" placeholder="For example Power BI dashboard, Snowflake, WMS, a table name" />
          <Area {...p} label="Description of the issue" k="issueDescription" required placeholder="What is happening, and any error messages" />
          <Area {...p} label="Business impact" k="businessImpact" placeholder="How is this affecting your work or the business?" />
          <Text {...p} label="Table name(s) or link(s) to product with issues" k="linkToTool" placeholder="For example DIM_SKU_PBI, or https://" />
        </>
      )
    case 'New Report/Tool':
      return (
        <>
          <Text {...p} label="Tool/report name" k="reportName" required placeholder="What should it be called?" />
          <Area {...p} label="Requirements" k="requirements" required placeholder="What the report or tool should do" />
          <Platforms d={d} set={set} />
          <ChipSelect label="Target audience" options={choices.targetAudience} value={d.targetAudience} onChange={(v) => set({ targetAudience: v })} />
          <Area {...p} label="Business Justification" k="businessJustification" placeholder="Why is this needed?" />
        </>
      )
    case 'Enhancement Request':
      return (
        <>
          <Text {...p} label="Tool / report name" k="reportName" required placeholder="The tool or report to change" />
          <Area {...p} label="What enhancement do you need?" k="enhancementAsk" required placeholder="The change or improvement you'd like to see" />
          <Platforms d={d} set={set} />
          <Area {...p} label="Business Justification" k="businessJustification" placeholder="The business value or impact of this enhancement" />
          <Text {...p} label="Link to existing tool or table name" k="linkToTool" placeholder="For example DIM_SKU_PBI, or https://" />
        </>
      )
    default:
      return null
  }
}

/** Everything that will be filed, as the review pop-up shows it. */
function ReviewSummary({ d }: { d: Draft }) {
  const { user, refData } = useApp()
  const view = viewOfDraft(d, user)
  const isDcOps = d.businessTeam === dcOpsName(refData)
  const rows = detailRows(view)
  const given = rows.filter((r) => r.value !== '-')
  const blanks = rows.filter((r) => r.value === '-').map((r) => r.label)
  return (
    <div className="review">
      <dl className="facts facts-row">
        <div><dt>Requester</dt><dd>{user.fullName}</dd></div>
        <div><dt>Requesting from</dt><dd>{d.businessTeam}</dd></div>
        <div><dt>{isDcOps ? 'Distribution center' : 'Team'}</dt><dd>{isDcOps ? d.dc : d.teamName}</dd></div>
        <div><dt>Request type</dt><dd>{d.requestType}</dd></div>
        <div><dt>Business area</dt><dd>{d.businessArea}</dd></div>
        <div><dt>Business priority</dt><dd>{d.priority}</dd></div>
      </dl>
      <dl className="detail">
        {given.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd className="pre">{r.value}</dd>
          </div>
        ))}
      </dl>
      {blanks.length > 0 && <p className="muted left-blank">Left blank: {blanks.join(', ')}</p>}
    </div>
  )
}

const bySort = <T extends { sortOrder?: number | null; id: number }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.id - b.id)

export function NewRequest() {
  const { ds, user, refData, draft, setDraft, resetDraft, notify, upsertRequest } = useApp()
  const navigate = useNavigate()
  const [tried, setTried] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const form = useRef<HTMLDivElement>(null)
  const dcOps = dcOpsName(refData)
  const isDcOps = draft.businessTeam === dcOps
  const otherTeam = draft.businessTeam !== '' && !isDcOps
  // Errors show only after a first attempt, then clear field by field as they are fixed.
  const need = (v: string, msg = 'Choose one to continue.') => (tried && blank(v) ? msg : undefined)
  const missing = tried ? missingDetailFields(draft) : []

  const review = () => {
    if (!stage1Complete(draft, refData) || missingDetailFields(draft).length > 0) {
      setTried(true)
      // wait for the errors to render, then take the reader to the first one
      requestAnimationFrame(() => {
        const first = form.current?.querySelector('.field-bad')
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        first?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
      })
      return
    }
    setReviewing(true)
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const saved = await submitNewRequest(ds, refData, user, draft)
      upsertRequest(saved)
      resetDraft()
      notify('success', `Request ${saved.title} submitted.`)
      navigate(`/requests/${saved.id}`)
    } catch (e) {
      setReviewing(false)
      notify('error', e instanceof SubmitError ? e.message : `The request could not be submitted: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  const startOver = () => {
    resetDraft()
    setTried(false)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>New request</h1>
          <p className="muted">
            Filing as {user.fullName}. Your progress is saved on this device as you go.
          </p>
        </div>
        {draftStarted(draft) && (
          <button className="btn btn-quiet" onClick={startOver}>
            Start over
          </button>
        )}
      </header>

      <div className="panel form fill" ref={form}>
        <section className="form-section" aria-labelledby="fs-route">
          <h2 id="fs-route">Who is asking</h2>
          <ChoiceCards
            legend="Requesting from"
            hint="The supply chain team you work in, not the analytics team you are asking. It sets your request ID prefix and routes the request."
            error={need(draft.businessTeam)}
            options={refData.teams.map((t) => ({ value: t.title }))}
            value={draft.businessTeam}
            // switching team clears the dependent field so a stale value is never submitted
            onChange={(v) => setDraft({ businessTeam: v, dc: '', teamName: '' })}
          />
          {isDcOps && (
            <Field label="Distribution center" required error={need(draft.dc)}>
              {(id) => <Select id={id} value={draft.dc} options={bySort(refData.dcs).map((x) => x.title)} onChange={(v) => setDraft({ dc: v })} />}
            </Field>
          )}
          {otherTeam && (
            <Field label="Team name" required error={need(draft.teamName, 'Fill this in to continue.')}>
              {(id, d) => (
                <input id={id} aria-describedby={d} className="input" maxLength={255} value={draft.teamName} placeholder="For example Network Planning, S&OP, Reverse Logistics" onChange={(e) => setDraft({ teamName: e.target.value })} />
              )}
            </Field>
          )}
        </section>

        <section className="form-section" aria-labelledby="fs-what">
          <h2 id="fs-what">What you need</h2>
          <ChoiceCards
            legend="Request type"
            error={need(draft.requestType)}
            columns={4}
            options={bySort(refData.requestTypes).map((t) => ({ value: t.title }))}
            value={draft.requestType}
            onChange={(v) => setDraft({ requestType: v as Draft['requestType'] })}
          />
          <ChoiceCards
            legend="Which side of the business is this for?"
            hint="Rx means pharmacy. Pick Not sure if you cannot tell; the analytics team will confirm."
            error={need(draft.businessArea)}
            columns={4}
            options={refData.choices.businessArea.map((a) => ({ value: a }))}
            value={draft.businessArea}
            onChange={(v) => setDraft({ businessArea: v })}
          />
          <ChoiceCards
            legend="Business priority"
            error={need(draft.priority)}
            columns={4}
            options={bySort(refData.priorities).map((p) => ({ value: p.title, desc: p.description }))}
            value={draft.priority}
            onChange={(v) => setDraft({ priority: v })}
          />
        </section>

        <section className="form-section" aria-labelledby="fs-details">
          <h2 id="fs-details">{draft.requestType ? `${draft.requestType} details` : 'Details'}</h2>
          {draft.requestType ? (
            <TypeFields d={draft} set={setDraft} missing={missing} />
          ) : (
            <p className="muted">Choose a request type above and its questions appear here.</p>
          )}
        </section>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={review}>
            Review and submit
          </button>
        </div>
      </div>

      {reviewing && (
        <Dialog
          title="Check your request"
          meta="This is what the analytics team will receive."
          onClose={() => !busy && setReviewing(false)}
          footer={
            <>
              <button className="btn" onClick={() => setReviewing(false)} disabled={busy}>
                Keep editing
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Submitting' : 'Submit request'}
              </button>
            </>
          }
        >
          <ReviewSummary d={draft} />
        </Dialog>
      )}
    </div>
  )
}
