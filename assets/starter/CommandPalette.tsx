import { Command } from 'cmdk'
import { Inbox, LayoutDashboard, Moon, Plus, Sun, Workflow } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { summaryOf } from '../logic/details'
import { useApp } from '../store'
import { RequestTag, StatusBadge } from './ui'

/** Jump anywhere, or straight to a request by ID, requester or subject. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { roles, requests, theme, toggleTheme } = useApp()
  const navigate = useNavigate()
  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  const rows = requests.state === 'ready' ? requests.rows : []

  return (
    <Command.Dialog open onOpenChange={(o) => !o && onClose()} label="Search SAGE" className="palette" overlayClassName="palette-scrim">
      <Command.Input placeholder="Search requests by ID, requester or subject" autoFocus />
      <Command.List>
        <Command.Empty>Nothing matches. Try a request ID such as DCOP-10001.</Command.Empty>
        <Command.Group heading="Go to">
          <Command.Item onSelect={() => go('/new')}>
            <Plus size={16} aria-hidden="true" /> New request
          </Command.Item>
          <Command.Item onSelect={() => go('/')}>
            <LayoutDashboard size={16} aria-hidden="true" /> Overview
          </Command.Item>
          <Command.Item onSelect={() => go('/requests')}>
            <Inbox size={16} aria-hidden="true" /> {roles.canTriage ? 'All requests' : 'My requests'}
          </Command.Item>
          {roles.canSeeDdatQueue && (
            <Command.Item onSelect={() => go('/ddat')}>
              <Workflow size={16} aria-hidden="true" /> DDAT queue
            </Command.Item>
          )}
          <Command.Item
            onSelect={() => {
              toggleTheme()
              onClose()
            }}
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          </Command.Item>
        </Command.Group>
        {rows.length > 0 && (
          <Command.Group heading="Requests">
            {rows.map((r) => (
              <Command.Item
                key={r.id}
                value={`${r.title} ${r.requesterName} ${summaryOf(r)} ${r.requestType?.value ?? ''}`}
                onSelect={() => go(`/requests/${r.id}`)}
              >
                <RequestTag id={r.title} />
                <span className="palette-subject">{summaryOf(r)}</span>
                <StatusBadge status={r.requestStatus?.value ?? ''} />
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
