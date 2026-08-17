import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Tag } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import AdminEntityForm, { AdminActiveToggle } from './AdminEntityForm'
import { adminClientFormSchema, type AdminClientFormValues } from './AdminClientForm.schema'
import './AdminClientForm.css'

interface AdminClientFormProps {
  initialValues?: AdminClientFormValues
  /** Present only in edit mode - a brand-new client has no deactivate toggle. */
  active?: boolean
  onActiveChange?: (nextActive: boolean) => void
  onSubmit: (values: AdminClientFormValues) => Promise<void>
  submitLabel: string
  onCancel?: () => void
}

function AdminClientForm({ initialValues, active, onActiveChange, onSubmit, submitLabel, onCancel }: AdminClientFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminClientFormValues>({
    resolver: zodResolver(adminClientFormSchema),
    defaultValues: initialValues ?? { name: '', contactDetails: '' },
  })

  const submit = async (values: AdminClientFormValues) => {
    setFormError(null)
    try {
      await onSubmit(values)
    } catch {
      setFormError('Could not save the client. Please try again.')
    }
  }

  const isEditMode = initialValues !== undefined

  return (
    <div className="admin-client-form-overlay">
      <div className="admin-client-form">
        <div className="admin-client-form__header">
          <button className="admin-client-form__close" onClick={onCancel} aria-label="Close form">
            <CloseOutlined />
          </button>
          <div className="admin-client-form__title-section">
            <div className="admin-client-form__title">
              {isEditMode ? 'עריכת לקוח' : 'יצירת לקוח'}
              {isEditMode && <Tag className="admin-client-form__edit-tag">עריכה</Tag>}
            </div>
            <div className="admin-client-form__subtitle">
              {isEditMode ? 'כאן תעדכן את פרטי הלקוח' : 'כאן תיצור את הלקוח החדש שיופיע במערכת'}
            </div>
          </div>
        </div>

        <AdminEntityForm onSubmit={handleSubmit(submit)}>
          {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

          <Form.Item label="שם הלקוח" htmlFor="name" validateStatus={errors.name ? 'error' : ''} help={errors.name?.message}>
            <Controller name="name" control={control} render={({ field }) => <Input {...field} id="name" placeholder="מה שם הלקוח" /> } />
          </Form.Item>

          <Form.Item label="תאור הלקוח" htmlFor="contactDetails">
            <Controller
              name="contactDetails"
              control={control}
              render={({ field }) => <Input.TextArea {...field} id="contactDetails" placeholder="תאר בקצרה את הלקוח" rows={4} />}
            />
          </Form.Item>

          {active !== undefined && onActiveChange && <AdminActiveToggle active={active} onChange={onActiveChange} />}

          <Button
            type={isEditMode ? 'primary' : 'default'}
            htmlType="submit"
            loading={isSubmitting}
            className={`admin-client-form__submit ${isEditMode ? 'admin-client-form__submit--edit' : 'admin-client-form__submit--create'}`}
          >
            {submitLabel}
          </Button>
        </AdminEntityForm>
      </div>
    </div>
  )
}

export default AdminClientForm
