import AdminListPage from '../../components/AdminListPage'
import { actionsColumn } from '../../components/adminActionsColumn'

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

const columns = [
  actionsColumn,
  { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 150 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 120 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Project', dataIndex: 'project', key: 'project', width: 150 },
  { title: 'Task Name', dataIndex: 'name', key: 'name' },
]

const matchesName = (task: TaskRecord, query: string) => task.name.toLowerCase().includes(query)

function AdminTasks() {
  return (
    <AdminListPage
      title="משימות"
      description="ניהול משימות בפרויקטים. יצירה, עריכה והקצאה של משימות לעובדים."
      searchPlaceholder="חיפוש לפי שם משימה"
      data={mockData}
      columns={columns}
      filter={matchesName}
    />
  )
}

export default AdminTasks
