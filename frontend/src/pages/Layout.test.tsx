import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'

const logoutAndRedirectMock = vi.fn()

vi.mock('../services/auth', () => ({
  logoutAndRedirect: (...args: unknown[]) => logoutAndRedirectMock(...args),
}))

afterEach(() => {
  cleanup()
  logoutAndRedirectMock.mockClear()
})

function renderLayout(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout logout control', () => {
  it('renders a logout control in the navigation', () => {
    renderLayout()

    expect(screen.getByText('התנתקות')).toBeInTheDocument()
  })

  it('invokes the logout flow when clicked', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByText('התנתקות'))

    expect(logoutAndRedirectMock).toHaveBeenCalledOnce()
  })

  it('does not render the logout control as the selected/active menu item', () => {
    renderLayout()

    const logoutItem = screen.getByText('התנתקות').closest('li')
    expect(logoutItem?.className).not.toMatch(/-item-selected/)
  })
})
