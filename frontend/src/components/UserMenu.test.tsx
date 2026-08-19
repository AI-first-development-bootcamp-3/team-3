import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import UserMenu from './UserMenu'
import { sessionStore } from '../services/sessionStore'

function renderMenu(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<UserMenu />} />
        <Route path="/admin/assignments" element={<UserMenu />} />
        <Route path="/change-password" element={<div>password page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserMenu', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('shows initials and opens a confirm step before logout', async () => {
    sessionStore.getState().setSession(
      { id: '1', fullName: 'Gal Israeli', email: 'gal@abra.test', userType: 'regular', active: true },
      'cookie',
      new Date(Date.now() + 60_000).toISOString(),
      false,
    )
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'תפריט חשבון' }))
    expect(screen.getByRole('button', { name: 'תפריט חשבון' })).toHaveTextContent('G')
    expect(screen.getByText('Gal Israeli')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ניהול' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'התנתקות' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'להתנתק?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ביטול' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'התנתקות' })).toBeInTheDocument()
  })

  it('offers ניהול only to admins on the hours screen', async () => {
    sessionStore.getState().setSession(
      { id: '1', fullName: 'Admin User', email: 'a@abra.test', userType: 'admin', active: true },
      'cookie',
      new Date(Date.now() + 60_000).toISOString(),
      false,
    )
    const user = userEvent.setup()
    renderMenu('/')

    await user.click(screen.getByRole('button', { name: 'תפריט חשבון' }))
    expect(screen.getByRole('menuitem', { name: 'ניהול' })).toHaveAttribute('href', '/admin/assignments')
    expect(screen.queryByRole('menuitem', { name: 'דיווח שעות' })).not.toBeInTheDocument()
  })
})
