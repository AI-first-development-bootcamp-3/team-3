import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

const logoutAndRedirectMock = vi.fn()

vi.mock('../services/auth', () => ({
  logoutAndRedirect: (...args: unknown[]) => logoutAndRedirectMock(...args),
}))

afterEach(() => {
  cleanup()
  logoutAndRedirectMock.mockClear()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>home</div>} />
          <Route path="absences" element={<div>absences</div>} />
          <Route path="admin" element={<div>admin</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('hides דיווח שעות / היעדרויות / ניהול on the hours home', () => {
    renderAt('/')

    expect(screen.queryByRole('link', { name: 'דיווח שעות' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'היעדרויות' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ניהול' })).not.toBeInTheDocument()
  })

  it('shows the app menu on absences', () => {
    renderAt('/absences')

    expect(screen.getByRole('link', { name: 'דיווח שעות' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'היעדרויות' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ניהול' })).toBeInTheDocument()
  })
})

describe('Layout logout control', () => {
  it('renders a logout control in the navigation', () => {
    renderAt('/absences')

    expect(screen.getByText('התנתקות')).toBeInTheDocument()
  })

  it('invokes the logout flow when clicked', async () => {
    const user = userEvent.setup()
    renderAt('/absences')

    await user.click(screen.getByText('התנתקות'))

    expect(logoutAndRedirectMock).toHaveBeenCalledOnce()
  })

  it('does not render the logout control as the selected/active menu item', () => {
    renderAt('/absences')

    const logoutItem = screen.getByText('התנתקות').closest('li')
    expect(logoutItem?.className).not.toMatch(/-item-selected/)
  })
})
