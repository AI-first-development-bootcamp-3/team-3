import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useNavigate } from 'react-router-dom'
import { changeOwnPassword } from '../services/auth'
import { sessionStore } from '../services/sessionStore'
import { changePasswordFormSchema, type ChangePasswordFormValues } from './ChangePassword.schema'

/**
 * Reached after login when the session's mustChangePassword flag is set
 * (temp password from admin-created accounts, SCRUM-209/SCRUM-58). No
 * current-password field: the caller already holds a valid session token,
 * which is the only proof of identity this flow requires.
 */
function ChangePassword() {
  const navigate = useNavigate()
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
      const { setSession } = sessionStore.getState()
      const { token } = sessionStore.getState()
      const updatedUser = await changeOwnPassword(values.newPassword)
      if (token) {
        setSession(updatedUser, token)
      }
      navigate('/', { replace: true })
    } catch {
      setFormError('Could not update your password. Please try again.')
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h1>Set a new password</h1>
      <p>You need to set a new password before continuing.</p>

      {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

      <Form.Item
        label="New password"
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
        label="Confirm new password"
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

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        Set password
      </Button>
    </Form>
  )
}

export default ChangePassword
