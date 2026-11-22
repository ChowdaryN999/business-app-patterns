import type { CurrentUser, RequestComment, Roles, SageRequest } from '../domain/types'
import { STATUS } from '../domain/types'
import { blank } from './format'

/** The conversation closes with the request: nothing is added once it is Completed or Rejected. */
export const conversationClosed = (r: SageRequest) =>
  r.requestStatus?.value === STATUS.completed || r.requestStatus?.value === STATUS.rejected

export const isRequesterOf = (r: SageRequest, user: CurrentUser) =>
  r.requestorEmail.trim().toLowerCase() === user.email.trim().toLowerCase()

export type Side = RequestComment['role']

/** Why this person cannot post as this side, or '' if they can. */
export function cannotPost(r: SageRequest, as: Side, user: CurrentUser, roles: Roles): string {
  if (conversationClosed(r)) return 'This request is closed, so the conversation is closed too.'
  if (as === 'admin' && !roles.canTriage) return 'Only a domain admin can reply on behalf of the analytics team.'
  if (as === 'requester' && !isRequesterOf(r, user)) return 'Only the person who submitted this request can reply as the requester.'
  return ''
}

export type CommentPlan = { ok: false; error: string } | { ok: true; comment: Omit<RequestComment, 'id' | 'created'> }

/** Decide what posting a message writes. The UI locks have their twin here, at the write. */
export function planComment(r: SageRequest, body: string, as: Side, user: CurrentUser, roles: Roles): CommentPlan {
  const blocked = cannotPost(r, as, user, roles)
  if (blocked) return { ok: false, error: blocked }
  if (blank(body)) return { ok: false, error: 'Write a message before sending.' }
  return { ok: true, comment: { requestId: r.id, body: body.trim(), authorName: user.fullName, authorEmail: user.email, role: as } }
}

export const commentsFor = (all: RequestComment[], requestId: number) =>
  all.filter((c) => c.requestId === requestId).sort((a, b) => a.created.localeCompare(b.created) || a.id - b.id)

/**
 * Who owes the next reply: whoever did NOT write the last message. Null when
 * nothing has been said or the request is closed.
 */
export function waitingOn(r: SageRequest, all: RequestComment[]): Side | null {
  if (conversationClosed(r)) return null
  const last = commentsFor(all, r.id).at(-1)
  if (!last) return null
  return last.role === 'admin' ? 'requester' : 'admin'
}
