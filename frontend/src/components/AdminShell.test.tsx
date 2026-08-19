import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminShell from './AdminShell'
import { sessionStore } from '../services/sessionStore'

afterEach(() => {
  cleanup()
  sessionStore.getState().clearSession()
})

function signInAdmin() {
  sessionStore.getState().setSession(
    { id: '1', fullName: 'דניאל מוצא', email: 'admin@abra.test', userType: 'admin', active: true },
    'cookie',
    new Date(Date.now() + 60_000).toISOString(),
    false,
  )
}

function renderAdmin(path = '/admin/assignments') {
  signInAdmin()
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />}>
          <Route path="assignments" element={<div>assignments page</div>} />
          <Route path="clients" element={<div>clients page</div>} />
          <Route path="projects" element={<div>projects page</div>} />
          <Route path="tasks" element={<div>tasks page</div>} />
          <Route path="hour-settings" element={<div>hour settings page</div>} />
          <Route path="users" element={<div>users page</div>} />
          <Route path="reports" element={<div>employee reports page</div>} />
          <Route path="month-lock" element={<div>month lock page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  it('lists every admin destination in the sidebar and omits overview', () => {
    renderAdmin()

    const nav = screen.getByRole('navigation', { name: 'ניהול' })
    expect(within(nav).queryByRole('link', { name: 'סקירה' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'ניהול לקוחות/פרויקטים' })).toHaveAttribute(
      'href',
      '/admin/assignments',
    )
    expect(within(nav).getByRole('link', { name: 'לקוחות' })).toHaveAttribute('href', '/admin/clients')
    expect(within(nav).getByRole('link', { name: 'פרויקטים' })).toHaveAttribute('href', '/admin/projects')
    expect(within(nav).getByRole('link', { name: 'משימות' })).toHaveAttribute('href', '/admin/tasks')
    expect(within(nav).getByRole('link', { name: 'הגדרת דיווחי שעות' })).toHaveAttribute(
      'href',
      '/admin/hour-settings',
    )
    expect(within(nav).getByRole('link', { name: 'משתמשים' })).toHaveAttribute('href', '/admin/users')
    expect(within(nav).getByRole('link', { name: 'דיווחי עובדים' })).toHaveAttribute('href', '/admin/reports')
    expect(within(nav).getByRole('link', { name: 'נעילת חודש' })).toHaveAttribute('href', '/admin/month-lock')
    expect(screen.getByText('דניאל מוצא')).toBeInTheDocument()
    expect(screen.getByText('מנהל מערכת')).toBeInTheDocument()
  })

  it('keeps the sidebar when opening hour settings', () => {
    renderAdmin('/admin/hour-settings')

    expect(screen.getByText('hour settings page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'הגדרת דיווחי שעות' })).toHaveClass('admin-sidebar__link--active')
  })

  it('marks the matching sidebar row when opening clients', () => {
    renderAdmin('/admin/clients')

    expect(screen.getByText('clients page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'לקוחות' })).toHaveClass('admin-sidebar__link--active')
  })
})
