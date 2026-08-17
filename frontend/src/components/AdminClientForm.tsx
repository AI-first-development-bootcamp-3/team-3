import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import AdminEntityForm, { AdminActiveToggle } from './AdminEntityForm'
import { adminClientFormSchema, type AdminClientFormValues } from './AdminClientForm.schema'

interface AdminClientFormProps {
  initialValues?: AdminClientFormValues
  /** Present only in edit mode - a brand-new client has no deactivate toggle. */
  active?: boolean
  onActiveChange?: (nextActive: boolean) => void
  onSubmit: (values: AdminClientFormValues) => Promise<void>
  submitLabel: string
}

function AdminClientForm({ initialValues, active, onActiveChange, onSubmit, submitLabel }: AdminClientFormProps) {
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

  return (
    <AdminEntityForm onSubmit={handleSubmit(submit)}>
      {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

      <Form.Item label="Name" htmlFor="name" validateStatus={errors.name ? 'error' : ''} help={errors.name?.message}>
        <Controller name="name" control={control} render={({ field }) => <Input {...field} id="name" />} />
      </Form.Item>

      <Form.Item label="Contact details" htmlFor="contactDetails">
        <Controller
          name="contactDetails"
          control={control}
          render={({ field }) => <Input {...field} id="contactDetails" />}
        />
      </Form.Item>

      {active !== undefined && onActiveChange && <AdminActiveToggle active={active} onChange={onActiveChange} />}

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </AdminEntityForm>
  )
}

export default AdminClientForm
