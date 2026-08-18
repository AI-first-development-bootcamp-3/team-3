import AdminListPage from '../../components/AdminListPage'
import { actionsColumn } from '../../components/adminActionsColumn'

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

const columns = [
  actionsColumn,
  { title: 'Manager', dataIndex: 'manager', key: 'manager', width: 150 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Client', dataIndex: 'client', key: 'client', width: 150 },
  { title: 'Project Name', dataIndex: 'name', key: 'name' },
]

const matchesName = (project: ProjectRecord, query: string) => project.name.toLowerCase().includes(query)

function AdminProjects() {
  return (
    <AdminListPage
      title="פרויקטים"
      description="ניהול פרויקטים. יצירה, עריכה והסרה של פרויקטים."
      searchPlaceholder="חיפוש לפי שם פרויקט"
      data={mockData}
      columns={columns}
      filter={matchesName}
    />
  )
}

export default AdminProjects
