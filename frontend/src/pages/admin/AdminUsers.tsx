import { Button, Input, Space, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
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

function AdminUsers() {
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)

  const columns = [
    {
      title: 'פעולות',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: () => (
        <Space>
          <Tooltip title="Delete">
            <DeleteOutlined style={{ color: '#dc2626', cursor: 'pointer', fontSize: 18 }} />
          </Tooltip>
          <Tooltip title="Edit">
            <EditOutlined style={{ color: '#dc2626', cursor: 'pointer', fontSize: 18 }} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
    },
    {
      title: 'Full Name',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 180,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
  ]

  const filteredData = useMemo(
    () => mockData.filter((user) => user.displayName.toLowerCase().includes(searchText.toLowerCase())),
    [searchText],
  )

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Button type="primary" style={{ minWidth: 106, height: 48 }} onClick={() => setShowForm(!showForm)}>
          יצירה
        </Button>
        <Input
          placeholder="חיפוש לפי שם משתמש"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>משתמשים</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            ניהול משתמשים במערכת. יצירה, עריכה והסרה של משתמשים.
          </p>
        </div>
      </div>

      {showForm && <CreateUserForm />}

      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 10, align: 'center' }}
        style={{ direction: 'rtl' }}
        size="middle"
        bordered={false}
      />
    </div>
  )
}

export default AdminUsers
