import { Table } from 'antd'
import type { TableProps } from 'antd'

/**
 * Thin wrapper over antd's Table shared by every admin entity list (users,
 * clients, projects, tasks, assignments). Sorting and RTL come from antd
 * itself (per-column `sorter`, and the app-wide ConfigProvider direction)
 * - this wrapper's job is just containing horizontal overflow so a wide
 * table never breaks the page layout on mobile.
 */
function AdminEntityTable<T extends object>(props: TableProps<T>) {
  return <Table<T> scroll={{ x: 'max-content' }} pagination={{ pageSize: 10 }} {...props} />
}

export default AdminEntityTable
