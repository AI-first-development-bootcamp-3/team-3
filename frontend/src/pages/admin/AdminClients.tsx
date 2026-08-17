import { Button, Input, Space, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface ClientRecord {
  key: string
  name: string
  email: string
  phone: string
  status: string
}

const mockData: ClientRecord[] = [
  { key: '1', name: 'EL-AL', email: 'contact@elal.com', phone: '+972-2-9777777', status: 'Active' },
  { key: '2', name: 'Cargo Systems', email: 'info@cargo.com', phone: '+972-3-1234567', status: 'Active' },
  { key: '3', name: 'Global Solutions', email: 'sales@global.com', phone: '+972-4-5678901', status: 'Active' },
]

function AdminClients() {
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: 'Client Name',
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
          placeholder="חיפוש לפי שם לקוח"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>לקוחות</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            ניהול לקוחות. יצירה, עריכה והסרה של פרטי לקוחות.
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

export default AdminClients
