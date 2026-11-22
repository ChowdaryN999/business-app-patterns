import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { initials } from '../logic/format'
import { useApp } from '../store'

export function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return photoUrl ? (
    <img className="avatar" src={photoUrl} alt="" />
  ) : (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function Field({
  label,
  required,
  hint,
  error,
  disabled,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  disabled?: boolean
  children: (id: string, describedBy: string | undefined) => ReactNode
}) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error || hint
  return (
    <div className={`field${disabled ? ' field-off' : ''}${error ? ' field-bad' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children(id, note ? noteId : undefined)}
      {note && (
        <div id={noteId} className={error ? 'field-error' : 'field-hint'} role={error ? 'alert' : undefined}>
          {note}
        </div>
      )}
    </div>
  )
}

export function Select({
  id,
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Select',
  label,
}: {
  id?: string
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
  /** For selects with no visible label (toolbar filters). */
  label?: string
}) {
  return (
    <select
      id={id}
      className="input"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {/* a stored value no longer offered must still display, not silently blank */}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/** Single choice as cards. A real radio group, so arrow keys and screen readers work. */
export function ChoiceCards({
  legend,
  hint,
  error,
  options,
  value,
  onChange,
  columns = 2,
  required = true,
}: {
  legend: string
  required?: boolean
  hint?: string
  error?: string
  options: { value: string; desc?: string }[]
  value: string
  onChange: (v: string) => void
  columns?: number
}) {
  const name = useId()
  return (
    <fieldset className={`choices${error ? ' field-bad' : ''}`}>
      <legend>
        {legend}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        <span className="legend-cue">Select one</span>
      </legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="choices-grid" style={{ ['--cols' as string]: columns }}>
        {options.map((o) => (
          <label key={o.value} className={`choice${value === o.value ? ' sel' : ''}`}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="choice-radio" aria-hidden="true" />
            <span className="choice-text">
              <span className="choice-title">{o.value}</span>
              {o.desc && <span className="choice-desc">{o.desc}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </fieldset>
  )
}

/** Multiple choice as toggle chips: every option visible, no dropdown to open. */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  return (
    <fieldset className="chipset">
      <legend>{label}</legend>
      <div className="chips">
        {options.map((o) => (
          <label key={o} className={`chip${value.includes(o) ? ' sel' : ''}`}>
            <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const TONE: Record<string, string> = {
  'Pending Review': 'pending',
  'Not Started': 'queued',
  'In Progress': 'prog',
  'On Hold': 'hold',
  Rejected: 'danger',
  Completed: 'ok',
  Requested: 'pending',
  Accepted: 'prog',
  Delivered: 'ok',
}
export const toneOf = (status: string) => TONE[status] ?? 'muted'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge tone-${toneOf(status)}`}>
      <span className="badge-dot" aria-hidden="true" />
      {status || 'No status'}
    </span>
  )
}

/** Flags pharmacy work wherever a request is shown. Renders nothing for Front Store, Not sure or blank. */
export function RxTag({ area }: { area: string }) {
  if (area !== 'Rx' && area !== 'Both') return null
  return (
    <span className="rx" title={area === 'Both' ? 'Front Store and Rx' : 'Rx (pharmacy)'}>
      {area === 'Both' ? 'FS + Rx' : 'Rx'}
    </span>
  )
}

/** A request ID drawn like a bin label: team code, then the number. */
export function RequestTag({ id }: { id: string }) {
  const [code, num] = id.includes('-') ? id.split('-', 2) : ['', id]
  return (
    <span className="tag">
      {code && <span className="tag-code">{code}</span>}
      <span className="tag-num">{num || 'New'}</span>
    </span>
  )
}

/** Side sheet on a native dialog: focus trap, Escape and backdrop come from the platform. */
export function Sheet({
  title,
  meta,
  onClose,
  children,
  footer,
}: {
  title: ReactNode
  meta?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet-head">
        <div>
          <h2>{title}</h2>
          {meta && <div className="sheet-meta">{meta}</div>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
      {footer && <div className="sheet-foot">{footer}</div>}
    </dialog>
  )
}

/** Centred modal on a native dialog. */
export function Dialog({
  title,
  meta,
  onClose,
  children,
  footer,
}: {
  title: string
  meta?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="sheet-head">
        <div>
          <h2>{title}</h2>
          {meta && <div className="sheet-meta">{meta}</div>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
      {footer && <div className="sheet-foot modal-foot">{footer}</div>}
    </dialog>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span>{t.text}</span>
          <button className="icon-btn" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
