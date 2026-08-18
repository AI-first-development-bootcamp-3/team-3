import { useState } from 'react'
import AdminListPage from '../../components/AdminListPage'
import { actionsColumn } from '../../components/adminActionsColumn'
import CreateUserForm from '../../components/CreateUserForm'

interface UserRecord {
  key: string
  email: string
  displayName: string
  role: string
  status: string
}

const mockData: UserRecord[] = [
  { key: '1', email: 'user1@example.com', displayName: 'יואב ישראלי', role: 'EMPLOYEE', status: 'Active' },
  { key: '2', email: 'user2@example.com', displayName: 'אריאל מזרחי', role: 'ADMIN', status: 'Active' },
  { key: '3', email: 'user3@example.com', displayName: 'גבריאל רון', role: 'EMPLOYEE', status: 'Active' },
  { key: '4', email: 'user4@example.com', displayName: 'לי כהן', role: 'EMPLOYEE', status: 'Inactive' },
]

const columns = [
  actionsColumn,
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Role', dataIndex: 'role', key: 'role', width: 120 },
  { title: 'Full Name', dataIndex: 'displayName', key: 'displayName', width: 180 },
  { title: 'Email', dataIndex: 'email', key: 'email' },
]

const matchesDisplayName = (user: UserRecord, query: string) => user.displayName.toLowerCase().includes(query)

function AdminUsers() {
  const [showForm, setShowForm] = useState(false)

  return (
    <AdminListPage
      title="משתמשים"
      description="ניהול משתמשים במערכת. יצירה, עריכה והסרה של משתמשים."
      searchPlaceholder="חיפוש לפי שם משתמש"
      data={mockData}
      columns={columns}
      filter={matchesDisplayName}
      onCreate={() => setShowForm(!showForm)}
    >
      {showForm && <CreateUserForm />}
    </AdminListPage>
  )
}

export default AdminUsers
