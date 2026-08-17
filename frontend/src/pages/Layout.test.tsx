import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Layout from './Layout'

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
  afterEach(() => {
    cleanup()
  })

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
