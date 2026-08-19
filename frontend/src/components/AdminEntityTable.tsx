import { useMemo, useState, type Key, type ReactNode } from 'react'
import '../pages/admin/AdminAssignments.css'

export type AdminTableColumn<T> = {
  title: ReactNode
  key?: Key
  dataIndex?: string
  render?: (value: any, record: T, index: number) => ReactNode
  sorter?: boolean | ((a: T, b: T) => number)
}

interface Props<T> {
  columns: AdminTableColumn<T>[]
  dataSource: T[]
  rowKey?: keyof T | ((record: T) => string)
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
}

function readValue<T>(row: T, dataIndex: string | undefined): unknown {
  if (!dataIndex) return undefined
  return (row as Record<string, unknown>)[dataIndex]
}

function rowIdentity<T>(row: T, rowKey: Props<T>['rowKey'], index: number): string {
  if (typeof rowKey === 'function') return rowKey(row)
  if (rowKey) return String(row[rowKey])
  const record = row as { key?: unknown; id?: unknown }
  if (record.key != null) return String(record.key)
  if (record.id != null) return String(record.id)
  return String(index)
}

function AdminEntityTable<T extends object>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  emptyMessage = 'אין מידע קיים עד כה',
  pageSize = 10,
}: Props<T>) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: Key; direction: 'asc' | 'desc' } | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return dataSource
    const column = columns.find((item) => (item.key ?? item.dataIndex) === sort.key)
    const compare = typeof column?.sorter === 'function' ? column.sorter : null
    if (!compare) return dataSource
    const copy = [...dataSource]
    copy.sort((left, right) => {
      const result = compare(left, right)
      return sort.direction === 'asc' ? result : -result
    })
    return copy
  }, [columns, dataSource, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const rows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (column: AdminTableColumn<T>) => {
    if (!column.sorter) return
    const key = column.key ?? column.dataIndex
    if (key == null) return
    setPage(1)
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const message = loading ? 'טוען…' : emptyMessage

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const key = column.key ?? column.dataIndex ?? String(column.title)
              const sortable = Boolean(column.sorter)
              return (
                <th
                  key={String(key)}
                  aria-sort={
                    sort?.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={sortable ? 'admin-table__th--sort' : undefined}
                  onClick={sortable ? () => toggleSort(column) : undefined}
                >
                  {column.title}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>
                <p className="admin-empty">{message}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowIdentity(row, rowKey, index)}>
                {columns.map((column) => {
                  const key = column.key ?? column.dataIndex ?? String(column.title)
                  const value = readValue(row, column.dataIndex)
                  return (
                    <td key={String(key)}>
                      {column.render ? column.render(value, row, index) : value == null ? '' : String(value)}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {sorted.length > pageSize ? (
        <div className="admin-pager">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)} aria-label="עמוד ראשון">
            «
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            aria-label="עמוד קודם"
          >
            ‹
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              aria-current={number === currentPage ? 'page' : undefined}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            aria-label="עמוד הבא"
          >
            ›
          </button>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(pageCount)}
            aria-label="עמוד אחרון"
          >
            »
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default AdminEntityTable
