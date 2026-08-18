import type { ReactNode } from 'react'
import { useState } from 'react'
import { Form, Popconfirm, Switch } from 'antd'

/**
 * Thin `<Form>` wrapper shared by every admin entity form - just layout
 * consistency, the actual field validation stays on react-hook-form + zod
 * per frontend-forms (see CreateUserForm.tsx as the reference).
 */
function AdminEntityForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <Form layout="vertical" onFinish={onSubmit}>
      {children}
    </Form>
  )
}

/**
 * Confirmation only guards the active -> inactive transition (soft-delete);
 * reactivating isn't destructive, so it applies immediately. The Switch
 * stays a controlled component bound to `active` - on cancel, `onChange`
 * never fires, so the caller's state (and the toggle's visual position)
 * is untouched. See specs/frontend-admin-crud-patterns/spec.md.
 */
function AdminActiveToggle({
  active,
  onChange,
  label = 'פעיל',
}: {
  active: boolean
  onChange: (nextActive: boolean) => void
  label?: string
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSwitchChange = (nextChecked: boolean) => {
    if (nextChecked) {
      onChange(true)
      return
    }
    setConfirmOpen(true)
  }

  return (
    <Form.Item label={label}>
      <Popconfirm
        title="השבתת הרשומה"
        description="הרשומה תסומן כלא פעילה. להמשיך?"
        okText="השבת"
        cancelText="ביטול"
        open={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false)
          onChange(false)
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        <Switch checked={active} onChange={handleSwitchChange} />
      </Popconfirm>
    </Form.Item>
  )
}

export default AdminEntityForm
export { AdminActiveToggle }
