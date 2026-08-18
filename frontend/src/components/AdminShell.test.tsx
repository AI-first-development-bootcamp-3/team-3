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
          <Route path="hour-settings" element={<div>hour settings page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  it('shows the Figma sidebar destinations and signed-in name', () => {
    renderAdmin()

    const nav = screen.getByRole('navigation', { name: 'ניהול' })
    expect(within(nav).getByRole('link', { name: 'ניהול לקוחות/פרויקטים' })).toHaveAttribute(
      'href',
      '/admin/assignments',
    )
    expect(within(nav).getByRole('link', { name: 'הגדרת דיווחי שעות' })).toHaveAttribute(
      'href',
      '/admin/hour-settings',
    )
    expect(within(nav).queryByRole('link', { name: 'משתמשים' })).not.toBeInTheDocument()
    expect(screen.getByText('דניאל מוצא')).toBeInTheDocument()
    expect(screen.getByText('מנהל מערכת')).toBeInTheDocument()
  })

  it('keeps the sidebar when opening hour settings', () => {
    renderAdmin('/admin/hour-settings')

    expect(screen.getByText('hour settings page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'הגדרת דיווחי שעות' })).toHaveClass('admin-sidebar__link--active')
  })
})
