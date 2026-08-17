import { Button, Input, Table } from 'antd'
import type { TableProps } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface AdminListPageProps<T> {
  title: string
  description: string
  searchPlaceholder: string
  data: T[]
  columns: TableProps<T>['columns']
  /** Row-level match against the current search text (already lowercased). */
  filter: (row: T, query: string) => boolean
  onCreate?: () => void
  /** Rendered between the toolbar and the table, e.g. an inline create form. */
  children?: ReactNode
}

function AdminListPage<T extends object>({
  title,
  description,
  searchPlaceholder,
  data,
  columns,
  filter,
  onCreate,
  children,
}: AdminListPageProps<T>) {
  const [searchText, setSearchText] = useState('')

  const filteredData = useMemo(() => {
    const query = searchText.toLowerCase()
    return data.filter((row) => filter(row, query))
  }, [data, filter, searchText])

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Button type="primary" style={{ minWidth: 106, height: 48 }} onClick={onCreate}>
          יצירה
        </Button>
        <Input
          placeholder={searchPlaceholder}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400, height: 48 }}
        />
        <div style={{ textAlign: 'right', flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 500 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{description}</p>
        </div>
      </div>

      {children}

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

export default AdminListPage
