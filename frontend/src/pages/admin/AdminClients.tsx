import AdminListPage from '../../components/AdminListPage'
import { actionsColumn } from '../../components/adminActionsColumn'

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

const columns = [
  actionsColumn,
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 150 },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 180 },
  { title: 'Client Name', dataIndex: 'name', key: 'name' },
]

const matchesName = (client: ClientRecord, query: string) => client.name.toLowerCase().includes(query)

function AdminClients() {
  return (
    <AdminListPage
      title="לקוחות"
      description="ניהול לקוחות. יצירה, עריכה והסרה של פרטי לקוחות."
      searchPlaceholder="חיפוש לפי שם לקוח"
      data={mockData}
      columns={columns}
      filter={matchesName}
    />
  )
}

export default AdminClients
