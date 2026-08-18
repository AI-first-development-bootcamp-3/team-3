import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Select, notification } from 'antd'
import { createUser } from '../services/adminUsers'
import { ApiError } from '../services/apiClient'
import { createUserFormSchema, type CreateUserFormValues } from './CreateUserForm.schema'
import './CreateUserForm.css'

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'עובד' },
  { value: 'ADMIN', label: 'מנהל' },
]

/**
 * Admin-only "Create User" form (SCRUM-202). Not wrapped in useMutation -
 * follows the same direct request()-in-submit-handler pattern as Login.tsx
 * and ChangePassword.tsx, so a 409 duplicate-email response can show as an
 * inline field error without also triggering queryClient's global
 * "unexpected error" toast (which fires for any error a useMutation doesn't
 * fully suppress).
 */
function CreateUserForm() {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { displayName: '', email: '', role: 'EMPLOYEE', temporaryPassword: '' },
  })

  const onSubmit = async (values: CreateUserFormValues) => {
    setFormError(null)
    try {
      const result = await createUser({
        displayName: values.displayName,
        email: values.email,
        role: values.role,
        ...(values.temporaryPassword ? { temporaryPassword: values.temporaryPassword } : {}),
      })

      notification.success({
        message: 'המשתמש נוצר',
        description: `${result.user.email} נוצר. סיסמה זמנית: ${result.temporaryPassword}`,
        duration: 0,
      })
      reset()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: 'כבר קיים משתמש עם האימייל הזה' })
        return
      }
      if (error instanceof ApiError && error.status === 400) {
        setFormError('חלק מהשדות אינם תקינים. בדקו את הטופס ונסו שוב.')
        return
      }
      setFormError('לא הצלחנו ליצור את המשתמש. נסו שוב.')
    }
  }

  return (
    <div className="admin-create-user" dir="rtl">
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h2>יצירת משתמש</h2>

      {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

      <Form.Item label="שם מלא" htmlFor="displayName" validateStatus={errors.displayName ? 'error' : ''} help={errors.displayName?.message}>
        <Controller
          name="displayName"
          control={control}
          render={({ field }) => <Input {...field} id="displayName" />}
        />
      </Form.Item>

      <Form.Item label="אימייל" htmlFor="email" validateStatus={errors.email ? 'error' : ''} help={errors.email?.message}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} id="email" type="email" autoComplete="off" className="admin-create-user__email" />}
        />
      </Form.Item>

      <Form.Item label="תפקיד" htmlFor="role" validateStatus={errors.role ? 'error' : ''} help={errors.role?.message}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => <Select {...field} id="role" options={ROLE_OPTIONS} />}
        />
      </Form.Item>

      <Form.Item
        label="סיסמה זמנית"
        htmlFor="temporaryPassword"
        validateStatus={errors.temporaryPassword ? 'error' : ''}
        help={errors.temporaryPassword?.message ?? 'השאירו ריק כדי לייצר סיסמה אוטומטית'}
      >
        <Controller
          name="temporaryPassword"
          control={control}
          render={({ field }) => <Input.Password {...field} id="temporaryPassword" autoComplete="off" />}
        />
      </Form.Item>

      <div className="admin-create-user__actions">
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          יצירת משתמש
        </Button>
      </div>
    </Form>
    </div>
  )
}

export default CreateUserForm
