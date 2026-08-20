import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listProjects, updateProject, type ReportFormat } from '../../services/adminProjects'
import './AdminAssignments.css'

function AdminHourSettings() {
  const [query, setQuery] = useState('')
  const projectsQuery = useQuery({ queryKey: ['adminProjects'], queryFn: listProjects })
  const [overrides, setOverrides] = useState<Record<string, ReportFormat>>({})

  const rows = useMemo(() => {
    return (projectsQuery.data ?? [])
      .filter((project) => project.isActive)
      .map((project) => ({
        ...project,
        reportFormat: overrides[project.id] ?? project.reportFormat,
      }))
  }, [overrides, projectsQuery.data])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(
      (row) => row.clientName.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle),
    )
  }, [query, rows])

  const setFormat = async (id: string, reportFormat: ReportFormat) => {
    const previous = overrides[id] ?? projectsQuery.data?.find((project) => project.id === id)?.reportFormat
    setOverrides((current) => ({ ...current, [id]: reportFormat }))
    try {
      await updateProject(id, { reportFormat })
    } catch {
      if (previous) setOverrides((current) => ({ ...current, [id]: previous }))
    }
  }

  const tableMessage = projectsQuery.isError
    ? 'לא הצלחנו לטעון. נסו שוב.'
    : projectsQuery.isLoading
      ? 'טוען…'
      : 'אין מידע קיים עד כה'

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">הגדרת דיווחי שעות</h1>
          <p className="admin-page__lead">כאן תוכל להגדיר את סוגי דיווח השעות של העובדים בפרויקטים השונים.</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם לקוח או פרויקט"
            />
          </label>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>שם פרויקט</th>
              <th>סוג דיווח</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <p className="admin-empty">{tableMessage}</p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.clientName}</td>
                  <td>{row.name}</td>
                  <td>
                    <label className="admin-radio">
                      <input
                        type="radio"
                        name={row.id}
                        checked={row.reportFormat === 'CLOCK_IN_OUT'}
                        onChange={() => {
                          void setFormat(row.id, 'CLOCK_IN_OUT')
                        }}
                        aria-label="כניסה/יציאה"
                      />
                      כניסה/יציאה
                    </label>
                    <label className="admin-radio">
                      <input
                        type="radio"
                        name={row.id}
                        checked={row.reportFormat === 'SUM_HOURS'}
                        onChange={() => {
                          void setFormat(row.id, 'SUM_HOURS')
                        }}
                        aria-label="סיכום שעות"
                      />
                      סיכום שעות
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AdminHourSettings
