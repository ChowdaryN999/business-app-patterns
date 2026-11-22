import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DataSource } from './data/DataSource'
import type { CurrentUser, Draft, ReferenceData, RequestComment, Roles, SageRequest } from './domain/types'
import { emptyDraft } from './domain/types'
import { resolveRoles } from './logic/roles'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'warning'
  text: string
}
export type Load<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; rows: T }
export type Theme = 'light' | 'dark'

interface AppState {
  ds: DataSource
  user: CurrentUser
  refData: ReferenceData
  roles: Roles
  roleWarning: string
  /** Everything this user may list: all requests for a triager, their own otherwise. */
  requests: Load<SageRequest[]>
  refreshRequests: () => Promise<void>
  /** Put a freshly saved request into the cached list without a round trip. */
  upsertRequest: (r: SageRequest) => void
  /** Conversation messages for every request in `requests`. Empty until loaded. */
  comments: RequestComment[]
  addComment: (c: RequestComment) => void
  draft: Draft
  setDraft: (patch: Partial<Draft>) => void
  resetDraft: () => void
  notify: (kind: Toast['kind'], text: string) => void
  toasts: Toast[]
  dismissToast: (id: number) => void
  theme: Theme
  toggleTheme: () => void
}

const Ctx = createContext<AppState | null>(null)
export const useApp = (): AppState => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}

type Boot =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; user: CurrentUser; refData: ReferenceData; roles: Roles; roleWarning: string }

// Storage can be unavailable inside the Power Apps host frame; the app must work without it.
const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      /* not persisted */
    }
  },
}

const DRAFT_KEY = 'sage.draft.v1'
function loadDraft(): Draft {
  const raw = store.get(DRAFT_KEY)
  if (!raw) return emptyDraft()
  try {
    return { ...emptyDraft(), ...(JSON.parse(raw) as Partial<Draft>) }
  } catch {
    return emptyDraft()
  }
}
export const draftStarted = (d: Draft) => JSON.stringify(d) !== JSON.stringify(emptyDraft())

function initialTheme(): Theme {
  const saved = store.get('sage.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AppProvider({ ds, children }: { ds: DataSource; children: ReactNode }) {
  const [boot, setBoot] = useState<Boot>({ phase: 'loading' })
  const [requests, setRequests] = useState<Load<SageRequest[]>>({ state: 'loading' })
  const [draft, setDraftState] = useState<Draft>(loadDraft)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const toastId = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggleTheme = useCallback(
    () =>
      setTheme((t) => {
        const next = t === 'dark' ? 'light' : 'dark'
        store.set('sage.theme', next)
        return next
      }),
    [],
  )

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const [user, refData] = await Promise.all([ds.getCurrentUser(), ds.getReferenceData()])
        const { roles, failedGroups } = await resolveRoles(ds, user, refData)
        const roleWarning = failedGroups.length
          ? `Could not check membership of: ${failedGroups.join(', ')}. You may be missing triage rights until this is fixed.`
          : ''
        if (live) setBoot({ phase: 'ready', user, refData, roles, roleWarning })
      } catch (e) {
        if (live) setBoot({ phase: 'error', message: errText(e) })
      }
    })()
    return () => {
      live = false
    }
  }, [ds])

  const ready = boot.phase === 'ready' ? boot : null
  const canTriage = ready?.roles.canTriage ?? false
  const email = ready?.user.email ?? ''

  // A plain requester's query is restricted to their own requests on the server.
  const refreshRequests = useCallback(async () => {
    if (!email) return
    try {
      const rows = await ds.listRequests(canTriage ? undefined : { requestorEmail: email })
      setRequests({ state: 'ready', rows })
    } catch (e) {
      setRequests({ state: 'error', message: errText(e) })
    }
  }, [ds, canTriage, email])
  useEffect(() => {
    void refreshRequests()
  }, [refreshRequests])

  // Conversations load after the requests they belong to; a failure leaves the threads empty rather than breaking the app.
  const [comments, setComments] = useState<RequestComment[]>([])
  const requestIds = requests.state === 'ready' ? requests.rows.map((r) => r.id).join(',') : ''
  useEffect(() => {
    if (!requestIds) return
    let live = true
    ds.listComments(requestIds.split(',').map(Number))
      .then((c) => live && setComments(c))
      .catch(() => live && setComments([]))
    return () => {
      live = false
    }
  }, [ds, requestIds])
  const addComment = useCallback((c: RequestComment) => setComments((cur) => [...cur.filter((x) => x.id !== c.id), c]), [])

  const upsertRequest = useCallback((r: SageRequest) => {
    setRequests((cur) => {
      if (cur.state !== 'ready') return cur
      const found = cur.rows.some((x) => x.id === r.id)
      return { state: 'ready', rows: found ? cur.rows.map((x) => (x.id === r.id ? r : x)) : [r, ...cur.rows] }
    })
  }, [])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (kind: Toast['kind'], text: string) => {
      const id = ++toastId.current
      setToasts((t) => [...t, { id, kind, text }])
      setTimeout(() => dismissToast(id), kind === 'error' ? 8000 : 5000)
    },
    [dismissToast],
  )

  const setDraft = useCallback(
    (patch: Partial<Draft>) =>
      setDraftState((d) => {
        const next = { ...d, ...patch }
        store.set(DRAFT_KEY, JSON.stringify(next))
        return next
      }),
    [],
  )
  const resetDraft = useCallback(() => {
    store.set(DRAFT_KEY, null)
    setDraftState(emptyDraft())
  }, [])

  const value = useMemo<AppState | null>(
    () =>
      ready
        ? {
            ds,
            user: ready.user,
            refData: ready.refData,
            roles: ready.roles,
            roleWarning: ready.roleWarning,
            requests,
            refreshRequests,
            upsertRequest,
            comments,
            addComment,
            draft,
            setDraft,
            resetDraft,
            notify,
            toasts,
            dismissToast,
            theme,
            toggleTheme,
          }
        : null,
    [ready, ds, requests, refreshRequests, upsertRequest, comments, addComment, draft, setDraft, resetDraft, notify, toasts, dismissToast, theme, toggleTheme],
  )

  if (boot.phase === 'loading')
    return (
      <div className="boot" role="status">
        <span className="spinner" aria-hidden="true" />
        Loading SAGE
      </div>
    )
  if (boot.phase === 'error')
    return (
      <div className="boot boot-error" role="alert">
        <strong>SAGE could not start.</strong>
        <span>{boot.message}</span>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
