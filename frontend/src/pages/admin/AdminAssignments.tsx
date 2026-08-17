import { Space, Tag } from 'antd'
import AdminListPage from '../../components/AdminListPage'
import { actionsColumn } from '../../components/adminActionsColumn'

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

const columns = [
  actionsColumn,
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
  { title: 'שם המשימה', dataIndex: 'task', key: 'task', width: 180 },
  { title: 'שם פרויקט', dataIndex: 'project', key: 'project', width: 180 },
  { title: 'שם לקוח', dataIndex: 'client', key: 'client', width: 160 },
]

const matchesWorker = (assignment: AssignmentRecord, query: string) =>
  assignment.workers.some((worker) => worker.toLowerCase().includes(query))

function AdminAssignments() {
  return (
    <AdminListPage
      title="שיוך עובד למשימה"
      description="כאן תוכל לשייך עובדים למשימות מתוך פרויקטים שונים של לקוחות."
      searchPlaceholder="חיפוש לפי שם עובד"
      data={mockData}
      columns={columns}
      filter={matchesWorker}
    />
  )
}

export default AdminAssignments
