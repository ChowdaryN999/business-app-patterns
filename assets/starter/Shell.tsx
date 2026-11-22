import { ExternalLink, Inbox, LayoutDashboard, Mail, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sun, Workflow, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import logo from '../assets/sage-logo.png'
import { STATUS } from '../domain/types'
import { LINKS } from '../links'
import { useApp } from '../store'
import { CommandPalette } from './CommandPalette'
import { Avatar, Toasts } from './ui'

const RAIL_KEY = 'sage.rail'
const readCollapsed = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === 'collapsed'
  } catch {
    return false
  }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Shell() {
  const { user, roles, roleWarning, requests, theme, toggleTheme } = useApp()
  const [palette, setPalette] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleRail = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? 'open' : 'collapsed')
      } catch {
        /* not persisted */
      }
      return !c
    })
  const { pathname } = useLocation()

  // Route changes close the mobile nav and return the reader to the top.
  useEffect(() => {
    setNavOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((o) => !o)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleRail()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const pending =
    roles.canTriage && requests.state === 'ready'
      ? requests.rows.filter((r) => r.requestStatus?.value === STATUS.pending).length
      : 0
  const mailto =
    `mailto:${LINKS.feedbackMailbox}?subject=${encodeURIComponent('SAGE feedback')}` +
    `&body=${encodeURIComponent(`From: ${user.fullName} (${user.email})\r\n\r\n`)}`
  const role = roles.isSageAdmin ? 'SAGE admin' : roles.myDomain ? `${roles.myDomain} admin` : roles.isDdat ? 'DDAT' : 'Requester'

  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button className="icon-btn on-navy" onClick={() => setNavOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Link to="/" aria-label="SAGE overview">
          <img src={logo} alt="SAGE" />
        </Link>
        <button className="icon-btn on-navy" onClick={() => setPalette(true)} aria-label="Search">
          <Search size={20} />
        </button>
      </header>

      {navOpen && <div className="rail-scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`rail${navOpen ? ' open' : ''}`}>
        <div className="rail-top">
          <Link to="/" className="rail-logo" aria-label="SAGE overview">
            <img src={logo} alt="SAGE" />
          </Link>
          <button className="icon-btn on-navy rail-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
          <button
            className="icon-btn on-navy rail-toggle"
            onClick={toggleRail}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={`${collapsed ? 'Expand' : 'Collapse'} navigation (${isMac ? '⌘B' : 'Ctrl B'})`}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <Link to="/new" className="btn btn-tape rail-new" title="New request">
          <Plus size={18} aria-hidden="true" />
          <span className="rail-label">New request</span>
        </Link>
        <button className="rail-search" aria-label="Search or jump to" title="Search or jump to" onClick={() => setPalette(true)}>
          <Search size={16} aria-hidden="true" />
          <span>Search or jump to</span>
          <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <nav className="rail-nav" aria-label="Main">
          <NavLink to="/" end title="Overview">
            <LayoutDashboard size={18} aria-hidden="true" />
            <span className="rail-label">Overview</span>
          </NavLink>
          <NavLink to="/requests" title={roles.canTriage ? 'All requests' : 'My requests'}>
            <Inbox size={18} aria-hidden="true" />
            <span className="rail-label">{roles.canTriage ? 'All requests' : 'My requests'}</span>
            {pending > 0 && (
              <span className="rail-count" aria-label={`${pending} pending review`}>
                {pending}
              </span>
            )}
          </NavLink>
          {roles.canSeeDdatQueue && (
            <NavLink to="/ddat" title="DDAT queue">
              <Workflow size={18} aria-hidden="true" />
              <span className="rail-label">DDAT queue</span>
            </NavLink>
          )}
        </nav>

        <nav className="rail-nav rail-links" aria-label="Resources">
          <h2>Resources</h2>
          <a href={LINKS.hub} target="_blank" rel="noopener noreferrer">
            SAGE Hub <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href={LINKS.korbyt} target="_blank" rel="noopener noreferrer">
            Korbyt <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href={LINKS.echo} target="_blank" rel="noopener noreferrer">
            ECHO <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href={mailto}>
            Email the SAGE team <Mail size={14} aria-hidden="true" />
          </a>
        </nav>

        <div className="rail-foot">
          <Avatar name={user.fullName} photoUrl={user.photoUrl} />
          <div className="rail-user">
            <strong>{user.fullName}</strong>
            <span>{role}</span>
          </div>
          <button
            className="icon-btn on-navy"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>

      <main id="main" className="content">
        {roleWarning && (
          <div className="banner" role="alert">
            {roleWarning}
          </div>
        )}
        <Outlet />
      </main>

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <Toasts />
    </div>
  )
}
