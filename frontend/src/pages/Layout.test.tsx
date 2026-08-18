import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Layout from './Layout'

afterEach(() => {
  cleanup()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>home</div>} />
          <Route path="admin" element={<div>admin</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('renders the child route without a global Ant Design menu', () => {
    renderAt('/')

    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'דיווח שעות' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'היעדרויות' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ניהול' })).not.toBeInTheDocument()
    expect(screen.queryByText('התנתקות')).not.toBeInTheDocument()
  })

  it('still renders nested routes such as admin', () => {
    renderAt('/admin')

    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
