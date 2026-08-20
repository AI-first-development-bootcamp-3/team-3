import { useState } from 'react'
import { notification } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminEntityTable from '../../components/AdminEntityTable'
import AdminClientForm from '../../components/AdminClientForm'
import { createClient, listClients, updateClient, type AdminClient } from '../../services/adminClients'
import './AdminAssignments.css'

function AdminClients() {
  const queryClient = useQueryClient()
  const { data: clients = [], isLoading } = useQuery({ queryKey: ['adminClients'], queryFn: listClients })

  const [editingClient, setEditingClient] = useState<AdminClient | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClients'] })
      setShowCreateForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; contactDetails?: string; isActive?: boolean }) =>
      updateClient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClients'] })
    },
  })

  const columns = [
    {
      title: 'שם',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: AdminClient, b: AdminClient) => a.name.localeCompare(b.name),
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
      sorter: (a: AdminClient, b: AdminClient) => Number(a.isActive) - Number(b.isActive),
    },
    {
      title: 'פעולות',
      key: 'actions',
      render: (_: unknown, client: AdminClient) => (
        <button type="button" className="admin-link-btn" onClick={() => setEditingClient(client)}>
          עריכה
        </button>
      ),
    },
  ]

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">לקוחות</h1>
          <p className="admin-page__lead">ניהול לקוחות, סטטוס פעילות ועריכת פרטים.</p>
        </div>
        <div className="admin-page__tools">
          <button type="button" className="admin-create__btn" onClick={() => setShowCreateForm(!showCreateForm)}>
            לקוח חדש
          </button>
        </div>
      </div>

      {editingClient && (
        <AdminClientForm
          key={editingClient.id}
          initialValues={{ name: editingClient.name, contactDetails: editingClient.contactDetails ?? '' }}
          active={editingClient.isActive}
          onActiveChange={async (nextActive) => {
            const previous = editingClient
            setEditingClient({ ...editingClient, isActive: nextActive })
            try {
              await updateMutation.mutateAsync({ id: editingClient.id, isActive: nextActive })
            } catch {
              setEditingClient(previous)
              notification.error({ message: 'שגיאה', description: 'לא ניתן היה לעדכן את סטטוס הלקוח' })
            }
          }}
          submitLabel="שמירה"
          onSubmit={async (values) => {
            await updateMutation.mutateAsync({ id: editingClient.id, ...values })
            setEditingClient(null)
          }}
          onCancel={() => setEditingClient(null)}
        />
      )}

      {showCreateForm && (
        <AdminClientForm
          submitLabel="יצירה"
          onSubmit={async (values) => {
            await createMutation.mutateAsync(values)
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <AdminEntityTable columns={columns} dataSource={clients} rowKey="id" loading={isLoading} />
    </section>
  )
}

export default AdminClients
