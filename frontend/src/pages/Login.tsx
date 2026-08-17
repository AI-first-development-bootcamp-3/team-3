import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { login } from '../services/auth'
import { sessionStore } from '../services/sessionStore'
import { ApiError } from '../services/apiClient'
import { loginFormSchema, type LoginFormValues } from './Login.schema'
import './Login.css'

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
  const [formError, setFormError] = useState<string | null>(null)
  const [lockedRemainingSeconds, setLockedRemainingSeconds] = useState<number | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  // Ticks the locked countdown down to zero without reloading or
  // resubmitting - see specs/frontend-auth-routing, "counts down the wait".
  // Only schedules the next tick; whether the locked message is still shown
  // at zero is derived at render time below, not set from here, so this
  // never calls setState synchronously within the effect body.
  useEffect(() => {
    if (lockedRemainingSeconds === null || lockedRemainingSeconds <= 0) return
    const timer = setTimeout(() => setLockedRemainingSeconds((seconds) => (seconds ?? 0) - 1), 1000)
    return () => clearTimeout(timer)
  }, [lockedRemainingSeconds])

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    setLockedRemainingSeconds(null)
    try {
      const { user, token, expiresAt } = await login(values.email, values.password, values.rememberMe)
      sessionStore.getState().setSession(user, token, expiresAt, values.rememberMe)
      navigate(user.mustChangePassword ? '/change-password' : from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('אימייל או סיסמה שגויים.')
        return
      }
      if (error instanceof ApiError && error.status === 429) {
        setFormError('יותר מדי ניסיונות. יש להמתין מספר דקות ולנסות שוב.')
        return
      }
      if (error instanceof ApiError && error.status === 423) {
        // Wording deliberately says nothing about whether the email is
        // registered - it is identical either way. See design.md.
        setFormError('החשבון ננעל זמנית עקב ניסיונות כניסה כושלים.')
        setLockedRemainingSeconds(error.retryAfterSeconds ?? 0)
        return
      }
      setFormError('משהו השתבש. נסו שוב.')
    }
  }

  const isLocked = lockedRemainingSeconds !== null && lockedRemainingSeconds > 0
  // Once the countdown reaches zero, the lock has lifted - the message is
  // dropped here rather than by clearing formError from the effect above.
  const alertMessage =
    lockedRemainingSeconds === 0
      ? null
      : isLocked
        ? `${formError} ניתן לנסות שוב בעוד ${formatRemaining(lockedRemainingSeconds)}.`
        : formError

  return (
    <Form className="login" layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h1>התחברות</h1>

      {alertMessage && <Alert type="error" message={alertMessage} showIcon style={{ marginBottom: 16 }} />}

      <Form.Item label="אימייל" htmlFor="email" validateStatus={errors.email ? 'error' : ''} help={errors.email?.message}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} id="email" type="email" autoComplete="username" dir="ltr" />}
        />
      </Form.Item>

      <Form.Item label="סיסמה" htmlFor="password" validateStatus={errors.password ? 'error' : ''} help={errors.password?.message}>
        <Controller
          name="password"
          control={control}
          render={({ field }) => <Input.Password {...field} id="password" autoComplete="current-password" dir="ltr" />}
        />
      </Form.Item>

      <Form.Item>
        <Controller
          name="rememberMe"
          control={control}
          render={({ field: { value, onChange, ...field } }) => (
            <Checkbox {...field} checked={value} onChange={(e) => onChange(e.target.checked)}>
              זכור אותי
            </Checkbox>
          )}
        />
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        loading={isSubmitting}
        disabled={isLocked}
      >
        התחבר
      </Button>
    </Form>
  )
}

export default Login
