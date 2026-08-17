import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach } from 'vitest'
import AdminEntityTable from './AdminEntityTable'

interface Row {
  key: string
  name: string
  role: string
}

const data: Row[] = [
  { key: '1', name: 'Bravo', role: 'ADMIN' },
  { key: '2', name: 'Alfa', role: 'EMPLOYEE' },
]

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: Row, b: Row) => a.name.localeCompare(b.name) },
  { title: 'Role', dataIndex: 'role', key: 'role' },
]

describe('AdminEntityTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders every row and column passed to it', () => {
    render(<AdminEntityTable columns={columns} dataSource={data} />)

    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByText('Alfa')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('EMPLOYEE')).toBeInTheDocument()
  })

  it('re-orders rows when a sortable column header is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminEntityTable columns={columns} dataSource={data} />)

    await user.click(screen.getByRole('columnheader', { name: 'Name' }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Alfa')
    expect(rows[1]).toHaveTextContent('Bravo')
  })
})
