import { Lock, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SageRequest } from '../domain/types'
import { cannotPost, commentsFor, conversationClosed, planComment } from '../logic/conversation'
import type { Side } from '../logic/conversation'
import { fmtStamp } from '../logic/format'
import { useApp } from '../store'
import { Avatar } from './ui'

const SIDE_LABEL: Record<Side, string> = { requester: 'Requester', admin: 'Analytics team' }

/**
 * The two-way thread between the requester and the analytics team. `as` is the
 * side this screen speaks for: the requester's own page, or the admin's tab.
 */
export function Conversation({ r, as, fill }: { r: SageRequest; as: Side; fill?: boolean }) {
  const { ds, user, roles, comments, addComment, notify } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const thread = commentsFor(comments, r.id)
  const blocked = cannotPost(r, as, user, roles)
  const closed = conversationClosed(r)
  const end = useRef<HTMLLIElement>(null)
  const count = thread.length
  // a new message scrolls into view, but opening the page does not jump to the thread
  const seen = useRef(count)
  useEffect(() => {
    if (count > seen.current) end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    // the admin's column opens on the newest message, like any chat
    else if (fill) end.current?.scrollIntoView({ block: 'nearest' })
    seen.current = count
  }, [count, fill])

  const send = async () => {
    if (busy) return
    const plan = planComment(r, text, as, user, roles)
    if (!plan.ok) return notify('error', plan.error)
    setBusy(true)
    try {
      addComment(await ds.addComment(plan.comment))
      setText('')
    } catch (e) {
      notify('error', `The message was not sent: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`panel convo${fill ? ' convo-fill' : ''}`} aria-labelledby="convo">
      <div className="panel-head">
        <h2 id="convo">Conversation</h2>
        <span className="muted">
          {as === 'admin' ? `${r.requesterName || 'The requester'} sees everything written here` : 'Between you and the analytics team'}
        </span>
      </div>

      {count === 0 ? (
        <p className="muted">
          {closed
            ? 'Nothing was said here before the request closed.'
            : as === 'admin'
              ? 'No messages yet. Ask the requester here instead of sending an email, and the answer stays with the request.'
              : 'No messages yet. If the team needs more detail they will ask here, and you can ask them anything about this request.'}
        </p>
      ) : (
        <ol className="convo-thread">
          {thread.map((c, i) => (
            <li key={c.id} ref={i === count - 1 ? end : undefined} className={c.role === as ? 'mine' : 'theirs'}>
              <Avatar name={c.authorName} />
              <div className="convo-msg">
                <div className="convo-meta">
                  <strong>{c.authorName}</strong>
                  <span className={`convo-side convo-${c.role}`}>{SIDE_LABEL[c.role]}</span>
                  <span className="muted">{fmtStamp(new Date(c.created))}</span>
                </div>
                <p className="pre">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {blocked ? (
        <p className="locked">
          <Lock size={16} aria-hidden="true" /> {blocked}
        </p>
      ) : (
        <div className="convo-compose">
          <textarea
            className="input area"
            aria-label={as === 'admin' ? 'Message to the requester' : 'Message to the analytics team'}
            placeholder={as === 'admin' ? 'Ask the requester a question or share an update' : 'Reply or ask a question'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send()
            }}
          />
          <div className="convo-send">
            <span className="muted">{as === 'admin' ? 'Visible to the requester. Use Internal comment for notes they should not see.' : 'No email is sent yet; the team sees this when they open SAGE.'}</span>
            <button className="btn btn-primary" onClick={send} disabled={busy || text.trim() === ''}>
              <Send size={16} aria-hidden="true" /> {busy ? 'Sending' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
