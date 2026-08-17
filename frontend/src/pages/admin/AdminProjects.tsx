import { Button, Input, Space, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface ProjectRecord {
  key: string
  name: string
  client: string
  status: string
  manager: string
}

const mockData: ProjectRecord[] = [
  { key: '1', name: 'Cargo', client: 'EL-AL', status: 'Active', manager: 'יואב ישראלי' },
  { key: '2', name: 'Crew-hub', client: 'EL-AL', status: 'Active', manager: 'אריאל מזרחי' },
  { key: '3', name: 'Globally', client: 'Global Solutions', status: 'Planning', manager: 'גבריאל רון' },
]

function AdminProjects() {
  const [searchText, setSearchText] = useState('')

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
      title: 'Manager',
      dataIndex: 'manager',
      key: 'manager',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
    },
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      width: 150,
    },
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      flex: 1,
    },
  ]

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Button type="primary" style={{ minWidth: 106, height: 48 }}>
          יצירה
        </Button>
        <Input
          placeholder="חיפוש לפי שם פרויקט"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>פרויקטים</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            ניהול פרויקטים. יצירה, עריכה והסרה של פרויקטים.
          </p>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={mockData}
        pagination={{ pageSize: 10, align: 'center' }}
        style={{ direction: 'rtl' }}
        size="middle"
        bordered={false}
      />
    </div>
  )
}

export default AdminProjects
