import type { CurrentUser, Person, ReferenceData, RequestComment, RequestPatch, SageRequest } from '../domain/types'

/**
 * Everything the app needs from the outside world. Two implementations:
 *  - mockDataSource: in-memory, for `npm run dev` outside Power Platform and for tests
 *  - powerDataSource: the generated Power Apps connector services (SharePoint,
 *    Office 365 Groups, Office 365 Users)
 */
export interface RequestFilter {
  requestorEmail?: string
  ddatOnly?: boolean
}

export interface DataSource {
  getCurrentUser(): Promise<CurrentUser>
  getReferenceData(): Promise<ReferenceData>
  /** Lower-cased UPNs and mail addresses of a group's direct members. */
  listGroupMemberEmails(groupId: string): Promise<string[]>
  /**
   * `requestorEmail` restricts to one requester (server-side, so a plain requester
   * never downloads other people's requests); `ddatOnly` restricts to escalations.
   */
  listRequests(filter?: RequestFilter): Promise<SageRequest[]>
  getRequest(id: number): Promise<SageRequest>
  createRequest(fields: RequestPatch): Promise<SageRequest>
  updateRequest(id: number, fields: RequestPatch): Promise<SageRequest>
  searchUsers(term: string): Promise<Person[]>
  /** Conversation messages for the given requests, oldest first. */
  listComments(requestIds: number[]): Promise<RequestComment[]>
  addComment(comment: Omit<RequestComment, 'id' | 'created'>): Promise<RequestComment>
}
