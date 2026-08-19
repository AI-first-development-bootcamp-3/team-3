import { useMemo, useState } from 'react'
import { Button, Tag } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminEntityTable from '../../components/AdminEntityTable'
import { listClients } from '../../services/adminClients'
import { listProjects } from '../../services/adminProjects'
import { listTasks, updateTask, type AdminTask } from '../../services/adminTasks'
import { CreateEntityDialog, EditEntityDialog } from './AdminFigmaDialogs'
import './AdminAssignments.css'

function AdminTasks() {
  const queryClient = useQueryClient()
  const tasksQuery = useQuery({ queryKey: ['adminTasks'], queryFn: listTasks })
  const clientsQuery = useQuery({ queryKey: ['adminClients'], queryFn: listClients })
  const projectsQuery = useQuery({ queryKey: ['adminProjects'], queryFn: listProjects })
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminTask | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = tasksQuery.data ?? []
    if (!needle) return rows
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.projectName.toLowerCase().includes(needle) ||
        row.clientName.toLowerCase().includes(needle),
    )
  }, [query, tasksQuery.data])

  const columns = [
    { title: 'משימה', dataIndex: 'name', key: 'name' },
    { title: 'פרויקט', dataIndex: 'projectName', key: 'projectName' },
    { title: 'לקוח', dataIndex: 'clientName', key: 'clientName' },
    {
      title: 'סטטוס משימה',
      dataIndex: 'status',
      key: 'status',
      render: (status: AdminTask['status']) => (status === 'OPEN' ? 'פתוחה' : 'סגורה'),
    },
    {
      title: 'פעיל',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'פעיל' : 'לא פעיל'}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, task: AdminTask) => (
        <Button type="link" onClick={() => setEditing(task)}>
          עריכה
        </Button>
      ),
    },
  ]

  return (
    <section>
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">משימות</h1>
          <p className="admin-page__lead">משימות לדיווח שעות תחת פרויקטים.</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי משימה, פרויקט או לקוח"
            />
          </label>
          <button type="button" className="admin-create__btn" onClick={() => setCreating(true)}>
            משימה חדשה
          </button>
        </div>
      </div>
      {creating ? (
        <CreateEntityDialog
          kind="task"
          clients={(clientsQuery.data ?? []).map((client) => ({ id: client.id, name: client.name }))}
          projects={(projectsQuery.data ?? []).map((project) => ({
            id: project.id,
            name: project.name,
            clientId: project.clientId,
          }))}
          onClose={() => setCreating(false)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
          }}
        />
      ) : null}
      {editing ? (
        <EditEntityDialog
          kind="task"
          initialName={editing.name}
          onClose={() => setEditing(null)}
          onSave={async (name) => {
            await updateTask(editing.id, { name })
            await queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
            setEditing(null)
          }}
        />
      ) : null}
      <AdminEntityTable columns={columns} dataSource={filtered} rowKey="id" loading={tasksQuery.isLoading} />
    </section>
  )
}

export default AdminTasks
