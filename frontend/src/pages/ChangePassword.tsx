import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { changeOwnPassword } from '../services/auth'
import { homePath } from '../services/authPaths'
import { sessionStore } from '../services/sessionStore'
import { changePasswordFormSchema, type ChangePasswordFormValues } from './ChangePassword.schema'

function ChangePassword() {
  const navigate = useNavigate()
  const user = sessionStore((state) => state.user)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setFormError(null)
    try {
      const updatedUser = await changeOwnPassword(values.newPassword)
      sessionStore.getState().updateUser(updatedUser)
      navigate(homePath(updatedUser), { replace: true })
    } catch {
      setFormError('לא ניתן לעדכן את הסיסמה. נסו שוב.')
    }
  }

  return (
    <div>
      <AppHeader title="שינוי סיסמה" />
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ maxWidth: 420, margin: '32px auto', padding: '0 16px' }}>
        <h1>שינוי סיסמה</h1>
        <p>בחרו סיסמה חדשה לחשבון {user?.email ?? ''}.</p>

        {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

        <Form.Item
          label="סיסמה חדשה"
          htmlFor="newPassword"
          validateStatus={errors.newPassword ? 'error' : ''}
          help={errors.newPassword?.message}
        >
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => <Input.Password {...field} id="newPassword" autoComplete="new-password" />}
          />
        </Form.Item>

        <Form.Item
          label="אימות סיסמה"
          htmlFor="confirmPassword"
          validateStatus={errors.confirmPassword ? 'error' : ''}
          help={errors.confirmPassword?.message}
        >
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => <Input.Password {...field} id="confirmPassword" autoComplete="new-password" />}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            שמירת סיסמה
          </Button>
          <Button htmlType="button" onClick={() => navigate(homePath(user))}>
            חזרה
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default ChangePassword
