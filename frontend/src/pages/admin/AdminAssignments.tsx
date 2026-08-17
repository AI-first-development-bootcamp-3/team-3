import { Button, Input, Space, Table, Tag, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'

interface AssignmentRecord {
  key: string
  client: string
  project: string
  task: string
  workers: string[]
}

const mockData: AssignmentRecord[] = [
  {
    key: '1',
    client: 'EL-AL',
    project: 'Cargo',
    task: 'פיתוח',
    workers: ['יואב ישראלי בכר', 'אריאל מזרחי', 'גבריאל רון', 'לי כהן', 'רז לוי', 'שירי כהן נפטלי'],
  },
  {
    key: '2',
    client: 'EL-AL',
    project: 'Crew-hub',
    task: 'פיתוח',
    workers: ['מארק לוי', 'נוגה דימן', 'דצאלי כהן', 'תמכי אברהם'],
  },
  {
    key: '3',
    client: 'EL-AL',
    project: 'Globally',
    task: 'פיתוח',
    workers: ['יוזואל רובין בכר', 'אריאל מזרחי', 'מארק לוי', 'נוגה דימן', 'דצאלי כהן', 'תמכי אברהם'],
  },
  {
    key: '4',
    client: 'EL-AL',
    project: 'Globally',
    task: 'יצוירה',
    workers: ['אוורי ברונה', 'מארק לוי', 'לי כהן', 'רז לוי'],
  },
  {
    key: '5',
    client: 'SMS',
    project: 'Space',
    task: 'פיתוח',
    workers: ['מארק לוי', 'נוגה דימן', 'דצאלי כהן', 'שירי כהן נפטלי'],
  },
]

function AdminAssignments() {
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
      title: 'שמות העובדים המשוייכים',
      dataIndex: 'workers',
      key: 'workers',
      render: (workers: string[]) => (
        <Space wrap size={[4, 8]}>
          {workers.map((worker) => (
            <Tag key={worker} style={{ backgroundColor: '#f3f4f6', color: '#212525', borderRadius: 4 }}>
              {worker}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'שם המשימה',
      dataIndex: 'task',
      key: 'task',
      width: 180,
    },
    {
      title: 'שם פרויקט',
      dataIndex: 'project',
      key: 'project',
      width: 180,
    },
    {
      title: 'שם לקוח',
      dataIndex: 'client',
      key: 'client',
      width: 160,
    },
  ]

  const filteredData = useMemo(
    () =>
      mockData.filter((assignment) =>
        assignment.workers.some((worker) => worker.toLowerCase().includes(searchText.toLowerCase())),
      ),
    [searchText],
  )

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Button type="primary" style={{ minWidth: 106, height: 48 }}>
          יצירה
        </Button>
        <Input
          placeholder="חיפוש לפי שם עובד"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>שיוך עובד למשימה</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            כאן תוכל לשייך עובדים למשימות מתוך פרויקטים שונים של לקוחות.
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

export default AdminAssignments
