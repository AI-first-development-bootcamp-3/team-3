import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { login } from '../services/auth'
import { sessionStore } from '../services/sessionStore'
import { ApiError } from '../services/apiClient'
import { loginFormSchema, type LoginFormValues } from './Login.schema'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      const { user, token } = await login(values.email, values.password)
      sessionStore.getState().setSession(user, token)
      navigate(user.mustChangePassword ? '/change-password' : from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Incorrect email or password.')
        return
      }
      setFormError('Something went wrong. Please try again.')
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h1>Login</h1>

      {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

      <Form.Item label="Email" htmlFor="email" validateStatus={errors.email ? 'error' : ''} help={errors.email?.message}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} id="email" type="email" autoComplete="username" />}
        />
      </Form.Item>

      <Form.Item label="Password" htmlFor="password" validateStatus={errors.password ? 'error' : ''} help={errors.password?.message}>
        <Controller
          name="password"
          control={control}
          render={({ field }) => <Input.Password {...field} id="password" autoComplete="current-password" />}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        Sign in
      </Button>
    </Form>
  )
}

export default Login
