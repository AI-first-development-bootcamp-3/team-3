import { useMemo, useState, type ReactNode } from 'react'
import AdminEntityTable, { type AdminTableColumn } from './AdminEntityTable'
import '../pages/admin/AdminAssignments.css'

interface AdminListPageProps<T extends object> {
  title: string
  description: string
  searchPlaceholder: string
  data: T[]
  columns: AdminTableColumn<T>[]
  filter: (row: T, query: string) => boolean
  onCreate?: () => void
  children?: ReactNode
}

function AdminListPage<T extends object>({
  title,
  description,
  searchPlaceholder,
  data,
  columns,
  filter,
  onCreate,
  children,
}: AdminListPageProps<T>) {
  const [searchText, setSearchText] = useState('')

  const filteredData = useMemo(() => {
    const query = searchText.toLowerCase()
    return data.filter((row) => filter(row, query))
  }, [data, filter, searchText])

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">{title}</h1>
          <p className="admin-page__lead">{description}</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>
          {onCreate ? (
            <button type="button" className="admin-create__btn" onClick={onCreate}>
              יצירה
            </button>
          ) : null}
        </div>
      </div>

      {children}

      <AdminEntityTable columns={columns} dataSource={filteredData} />
    </section>
  )
}

export default AdminListPage
