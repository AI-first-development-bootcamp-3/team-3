import { useState } from 'react'
import { Button, Tag, notification } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminEntityTable from '../../components/AdminEntityTable'
import AdminClientForm from '../../components/AdminClientForm'
import { createClient, listClients, updateClient, type AdminClient } from '../../services/adminClients'

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
      render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'פעיל' : 'לא פעיל'}</Tag>,
      sorter: (a: AdminClient, b: AdminClient) => Number(a.isActive) - Number(b.isActive),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, client: AdminClient) => (
        <Button type="link" onClick={() => setEditingClient(client)}>
          עריכה
        </Button>
      ),
    },
  ]

  return (
    <div dir="rtl">
      <h1>לקוחות</h1>

      {editingClient && (
        <AdminClientForm
          key={editingClient.id}
          initialValues={{ name: editingClient.name, contactDetails: editingClient.contactDetails ?? '' }}
          active={editingClient.isActive}
          onActiveChange={async (nextActive) => {
            // Optimistic, but rolled back on failure - the toggle must not
            // stay flipped when the server rejected the change.
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

      <Button type="primary" onClick={() => setShowCreateForm(!showCreateForm)} style={{ marginBottom: 16 }}>
        לקוח חדש
      </Button>

      <AdminEntityTable columns={columns} dataSource={clients} rowKey="id" loading={isLoading} />
    </div>
  )
}

export default AdminClients
