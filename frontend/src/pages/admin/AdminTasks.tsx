import { Button, Input, Space, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'

interface TaskRecord {
  key: string
  name: string
  project: string
  status: string
  priority: string
  assignee: string
}

const mockData: TaskRecord[] = [
  { key: '1', name: 'פיתוח API', project: 'Cargo', status: 'In Progress', priority: 'High', assignee: 'יואב ישראלי' },
  { key: '2', name: 'עיצוב UI', project: 'Crew-hub', status: 'Done', priority: 'Medium', assignee: 'אריאל מזרחי' },
  { key: '3', name: 'בדיקות', project: 'Globally', status: 'To Do', priority: 'High', assignee: 'גבריאל רון' },
  { key: '4', name: 'דוקומנטציה', project: 'Globally', status: 'In Progress', priority: 'Low', assignee: 'לי כהן' },
]

function AdminTasks() {
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
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 150,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
    },
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      width: 150,
    },
    {
      title: 'Task Name',
      dataIndex: 'name',
      key: 'name',
    },
  ]

  const filteredData = useMemo(
    () => mockData.filter((task) => task.name.toLowerCase().includes(searchText.toLowerCase())),
    [searchText],
  )

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Button type="primary" style={{ minWidth: 106, height: 48 }}>
          יצירה
        </Button>
        <Input
          placeholder="חיפוש לפי שם משימה"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>משימות</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            ניהול משימות בפרויקטים. יצירה, עריכה והקצאה של משימות לעובדים.
          </p>
        </div>
      </div>

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

export default AdminTasks
