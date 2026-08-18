import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import AdminOverview from './AdminOverview'

afterEach(() => {
  cleanup()
})

describe('AdminOverview', () => {
  it('links to every admin area including month lock', () => {
    render(
      <MemoryRouter>
        <AdminOverview />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'ניהול המערכת' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /משתמשים/ })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: /נעילת חודש/ })).toHaveAttribute('href', '/admin/month-lock')
    expect(screen.getByRole('link', { name: /דיווחי עובדים/ })).toHaveAttribute('href', '/admin/reports')
    expect(screen.getByRole('link', { name: /שיוכים/ })).toHaveAttribute('href', '/admin/assignments')
  })
})
