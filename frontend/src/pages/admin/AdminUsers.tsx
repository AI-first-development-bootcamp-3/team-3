import { useMemo, useState } from 'react'
import { App, Select } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminEntityTable from '../../components/AdminEntityTable'
import CreateUserForm from '../../components/CreateUserForm'
import {
  listUsers,
  resetUserPassword,
  updateUserRole,
  updateUserStatus,
  type AdminUser,
  type BackendRole,
} from '../../services/adminUsers'
import './AdminAssignments.css'

function AdminUsers() {
  const { notification } = App.useApp()
  const queryClient = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['adminUsers'], queryFn: listUsers })
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return users
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    )
  }, [query, users])

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateUserStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: BackendRole }) => updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  })

  const columns = [
    { title: 'שם', dataIndex: 'displayName', key: 'displayName' },
    { title: 'אימייל', dataIndex: 'email', key: 'email' },
    {
      title: 'תפקיד',
      key: 'role',
      render: (_: unknown, user: AdminUser) => (
        <Select
          aria-label={`תפקיד ${user.displayName}`}
          value={user.role}
          options={[
            { value: 'EMPLOYEE', label: 'עובד' },
            { value: 'ADMIN', label: 'מנהל' },
          ]}
          onChange={(role) => roleMutation.mutate({ id: user.id, role })}
          style={{ minWidth: 110 }}
        />
      ),
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
      render: (_: unknown, user: AdminUser) => (
        <div className="admin-table__actions">
          <button
            type="button"
            className="admin-link-btn"
            onClick={() => statusMutation.mutate({ id: user.id, isActive: !user.isActive })}
          >
            {user.isActive ? 'השבתה' : 'הפעלה'}
          </button>
          <button
            type="button"
            className="admin-link-btn"
            onClick={async () => {
              const result = await resetUserPassword(user.id)
              notification.success({
                message: 'סיסמה זמנית חדשה',
                description: `${user.email}: ${result.temporaryPassword}`,
                duration: 0,
              })
            }}
          >
            איפוס סיסמה
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">משתמשים</h1>
          <p className="admin-page__lead">יצירה, שינוי תפקיד, הפעלה ואיפוס סיסמה.</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם או אימייל"
            />
          </label>
          <button type="button" className="admin-create__btn" onClick={() => setShowCreate((open) => !open)}>
            משתמש חדש
          </button>
        </div>
      </div>
      {showCreate ? <CreateUserForm /> : null}
      <AdminEntityTable columns={columns} dataSource={filtered} rowKey="id" loading={isLoading} />
    </section>
  )
}

export default AdminUsers
