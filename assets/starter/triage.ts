import type { CurrentUser, Person, ReferenceData, RequestPatch, Roles, SageRequest, StatusRow } from '../domain/types'
import { DDAT_STATUS, STATUS } from '../domain/types'
import { blank, coalesce, fmtStamp } from './format'

/** What the triage panel holds when Save is pressed. */
export interface TriageForm {
  /** "Need DDAT support?" */
  needDdat: boolean
  ddatPriority: string
  ddatAsk: string
  /** Selected request status, '' if the dropdown is empty. */
  status: string
  /** Selected owning domain (SCL_TEAM title), '' if untouched. */
  domain: string
  /** Front Store / Rx / Both / Not sure; the admin may correct what the requester chose. */
  businessArea: string
  assignee: Person | null
  resolution: string
  resolutionLink: string
  comment: string
}

export const isCompleted = (r: SageRequest) => r.requestStatus?.value === STATUS.completed
export const isEscalated = (r: SageRequest) => r.ddatNeeded === 'Yes'
const ddatStage = (r: SageRequest) => coalesce(r.ddatStatus, DDAT_STATUS.requested)
const ddatOpen = (r: SageRequest) => ddatStage(r) !== DDAT_STATUS.delivered && ddatStage(r) !== DDAT_STATUS.rejected

export function initialTriageForm(r: SageRequest): TriageForm {
  return {
    needDdat: isEscalated(r),
    ddatPriority: r.ddatPriority,
    ddatAsk: r.ddatAsk,
    status: r.requestStatus?.value ?? '',
    domain: r.businessTeam?.value ?? '',
    businessArea: r.businessArea,
    assignee: r.assignedTo,
    resolution: r.resolution,
    resolutionLink: r.resolutionLink,
    comment: '',
  }
}

/** "Completed" is withheld while a DDAT dependency is still open. */
export function statusOptions(statuses: StatusRow[], r: SageRequest, needDdat: boolean): StatusRow[] {
  return needDdat && ddatOpen(r) ? statuses.filter((s) => s.title !== STATUS.completed) : statuses
}

/** Resolution and its link are editable only when closing (Completed or Rejected). */
export const closing = (status: string) => status === STATUS.completed || status === STATUS.rejected

export type TriagePlan =
  | { ok: false; error: string }
  | { ok: true; patch: RequestPatch; summary: string }

/**
 * Decide what a triage Save writes. Every UI lock has a twin here: the guards run
 * at the write, not just on the controls, so a disabled field can never be the
 * only thing standing between a user and a bad update.
 */
export function planTriageSave(
  r: SageRequest,
  f: TriageForm,
  roles: Roles,
  user: CurrentUser,
  ref: ReferenceData,
  now: Date,
): TriagePlan {
  const fail = (error: string): TriagePlan => ({ ok: false, error })
  const escalated = isEscalated(r)
  const firstEscalation = f.needDdat && !escalated

  if (!roles.canTriage) return fail('You do not have triage rights on this request.')
  if (isCompleted(r)) return fail('This request is completed and can no longer be edited.')
  // A domain admin cannot un-escalate: wiping DDAT status would leave the sub-team
  // and assignee populated on a request that claims no DDAT involvement.
  if (!f.needDdat && escalated)
    return fail('DDAT already holds this request. Only DDAT can end it, by delivering or rejecting.')
  if (closing(f.status) && blank(f.resolution)) return fail('Add a Resolution before closing this request.')
  if (f.status === STATUS.completed && f.needDdat && ddatOpen(r))
    return fail('DDAT has not delivered yet, so this request cannot be completed.')
  if (firstEscalation && blank(f.ddatPriority)) return fail('Select a DDAT priority.')
  if (firstEscalation && blank(f.ddatAsk)) return fail('Say what you need DDAT to do.')

  const currentStatus = r.requestStatus?.value ?? ''
  const currentDomain = r.businessTeam?.value ?? ''

  // A blank dropdown falls back to the stored value, so a blank is never logged or written.
  let newStatus = coalesce(f.status, currentStatus)
  // Raising a DDAT dependency means work has started. Only from Pending Review or Not Started,
  // so an explicit On Hold is never undone.
  if (firstEscalation && (newStatus === STATUS.pending || newStatus === STATUS.notStarted)) newStatus = STATUS.inProgress
  // Cross-domain hand-off re-queues the request for the receiving domain's admins.
  const newDomain = coalesce(f.domain, currentDomain)
  const domainMoved = newDomain !== currentDomain
  if (domainMoved) newStatus = STATUS.pending

  const statusRow = ref.statuses.find((s) => s.title === newStatus)
  const teamRow = ref.teams.find((t) => t.title === newDomain)
  if (!statusRow) return fail(`"${newStatus}" is not a status in SCL_Request_Status. Reload the app and try again.`)
  if (!teamRow) return fail(`"${newDomain}" is not a team in SCL_TEAM. Reload the app and try again.`)

  const changes: string[] = []
  if (domainMoved) changes.push(`Domain → ${newDomain} (was ${currentDomain})`)
  if (newStatus !== currentStatus) changes.push(`Status → ${newStatus}`)
  if (firstEscalation) changes.push(`DDAT → Requested (${f.ddatPriority})`)
  if ((f.assignee?.email ?? '').toLowerCase() !== (r.assignedTo?.email ?? '').toLowerCase())
    changes.push(`Assigned to ${f.assignee?.displayName || 'nobody'}`)
  if (f.resolution !== r.resolution) changes.push('Resolution updated')
  if (f.resolutionLink !== r.resolutionLink) changes.push('Link updated')
  // A blank selection keeps the stored answer, so the area is never cleared by accident.
  const newArea = coalesce(f.businessArea, r.businessArea)
  if (newArea !== r.businessArea) changes.push(`Business area → ${newArea}`)

  // Nothing changed and nothing written: refuse, so repeated Saves cannot pad the thread.
  if (changes.length === 0 && blank(f.comment)) return fail('Nothing to save. Change a field or add a comment.')

  const summary = changes.length ? changes.join(' · ') : 'Comment'
  const entry =
    `${fmtStamp(now)} · ${user.fullName} · ${summary}` +
    (blank(f.comment) ? '' : `\n${f.comment}`) +
    (blank(r.comment) ? '' : `\n\n${r.comment}`)

  const patch: RequestPatch = {
    requestStatus: { id: statusRow.id, value: statusRow.title },
    // The owning domain moves; the request ID (title) deliberately does not.
    businessTeam: { id: teamRow.id, value: teamRow.title },
    assignedTo: f.assignee,
    resolution: f.resolution,
    resolutionLink: f.resolutionLink,
    completionDate: newStatus === STATUS.completed && !r.completionDate ? now.toISOString() : r.completionDate,
    ddatNeeded: f.needDdat ? 'Yes' : 'No',
    ddatPriority: f.needDdat ? coalesce(f.ddatPriority, r.ddatPriority) : '',
    ddatStatus: !f.needDdat ? '' : escalated ? ddatStage(r) : DDAT_STATUS.requested,
    ddatAsk: f.needDdat ? f.ddatAsk : '',
    businessArea: newArea,
    ddatDeliveredDate:
      f.needDdat && escalated && r.ddatStatus === DDAT_STATUS.delivered
        ? (r.ddatDeliveredDate ?? now.toISOString())
        : null,
    comment: entry,
  }
  return { ok: true, patch, summary }
}

/** The activity thread is newest-first entries separated by a blank line. */
export function activityEntries(comment: string): string[] {
  return blank(comment) ? [] : comment.split('\n\n').filter((e) => e.trim() !== '')
}
