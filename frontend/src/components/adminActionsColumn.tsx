import { Space, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'

/**
 * The trailing "פעולות" column shared by every admin list. Icons are inert for
 * now; wiring them up here reaches all five pages at once.
 */
export const actionsColumn = {
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
}
