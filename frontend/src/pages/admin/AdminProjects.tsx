import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminEntityTable from '../../components/AdminEntityTable'
import { listClients } from '../../services/adminClients'
import { listProjects, updateProject, type AdminProject } from '../../services/adminProjects'
import { CreateEntityDialog, EditEntityDialog } from './AdminFigmaDialogs'
import './AdminAssignments.css'

function AdminProjects() {
  const queryClient = useQueryClient()
  const projectsQuery = useQuery({ queryKey: ['adminProjects'], queryFn: listProjects })
  const clientsQuery = useQuery({ queryKey: ['adminClients'], queryFn: listClients })
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminProject | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = projectsQuery.data ?? []
    if (!needle) return rows
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.clientName.toLowerCase().includes(needle) ||
        (row.managerName ?? '').toLowerCase().includes(needle),
    )
  }, [projectsQuery.data, query])

  const columns = [
    { title: 'פרויקט', dataIndex: 'name', key: 'name' },
    { title: 'לקוח', dataIndex: 'clientName', key: 'clientName' },
    { title: 'מנהל', dataIndex: 'managerName', key: 'managerName', render: (value: string | null) => value ?? '—' },
    {
      title: 'סוג דיווח',
      dataIndex: 'reportFormat',
      key: 'reportFormat',
      render: (format: AdminProject['reportFormat']) => (format === 'CLOCK_IN_OUT' ? 'כניסה/יציאה' : 'סיכום שעות'),
    },
    {
      title: 'סטטוס',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <span className={isActive ? 'admin-status admin-status--on' : 'admin-status admin-status--off'}>
          {isActive ? 'פעיל' : 'לא פעיל'}
        </span>
      ),
    },
    {
      title: 'פעולות',
      key: 'actions',
      render: (_: unknown, project: AdminProject) => (
        <button type="button" className="admin-link-btn" onClick={() => setEditing(project)}>
          עריכה
        </button>
      ),
    },
  ]

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">פרויקטים</h1>
          <p className="admin-page__lead">פרויקטים תחת לקוחות, כולל מנהל וחלון דיווח.</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי פרויקט, לקוח או מנהל"
            />
          </label>
          <button type="button" className="admin-create__btn" onClick={() => setCreating(true)}>
            פרויקט חדש
          </button>
        </div>
      </div>
      {creating ? (
        <CreateEntityDialog
          kind="project"
          clients={(clientsQuery.data ?? []).map((client) => ({ id: client.id, name: client.name }))}
          projects={[]}
          onClose={() => setCreating(false)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['adminProjects'] })
          }}
        />
      ) : null}
      {editing ? (
        <EditEntityDialog
          kind="project"
          initialName={editing.name}
          onClose={() => setEditing(null)}
          onSave={async (name) => {
            await updateProject(editing.id, { name })
            await queryClient.invalidateQueries({ queryKey: ['adminProjects'] })
            setEditing(null)
          }}
        />
      ) : null}
      <AdminEntityTable
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={projectsQuery.isLoading}
      />
    </section>
  )
}

export default AdminProjects
