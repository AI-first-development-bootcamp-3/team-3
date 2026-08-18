import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { login } from '../services/auth'
import { postLoginPath } from '../services/authPaths'
import { sessionStore } from '../services/sessionStore'
import { readLastEmail, writeLastEmail } from '../services/sessionStorageAdapter'
import { ApiError } from '../services/apiClient'
import { loginFormSchema, type LoginFormValues } from './Login.schema'
import abraLogo from '../assets/home/abra-logo.svg'
import './Login.css'

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function inactiveMessage(error: ApiError): boolean {
  const code = (error.body as { error?: { code?: string } } | undefined)?.error?.code
  return error.status === 403 && code === 'ACCOUNT_INACTIVE'
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname
  const [formError, setFormError] = useState<string | null>(null)
  const [lockedRemainingSeconds, setLockedRemainingSeconds] = useState<number | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: readLastEmail(), password: '', rememberMe: false },
  })

  useEffect(() => {
    if (lockedRemainingSeconds === null || lockedRemainingSeconds <= 0) return
    const timer = setTimeout(() => setLockedRemainingSeconds((seconds) => (seconds ?? 0) - 1), 1000)
    return () => clearTimeout(timer)
  }, [lockedRemainingSeconds])

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    setLockedRemainingSeconds(null)
    try {
      const { user, expiresAt } = await login(values.email, values.password, values.rememberMe)
      writeLastEmail(values.email)
      sessionStore.getState().setSession(user, 'cookie', expiresAt, values.rememberMe)
      navigate(postLoginPath(user, from), { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('אימייל או סיסמה שגויים.')
        return
      }
      if (error instanceof ApiError && inactiveMessage(error)) {
        setFormError('החשבון אינו פעיל. פנו למנהל המערכת.')
        return
      }
      if (error instanceof ApiError && error.status === 429) {
        setFormError('יותר מדי ניסיונות. יש להמתין מספר דקות ולנסות שוב.')
        return
      }
      if (error instanceof ApiError && error.status === 423) {
        setFormError('החשבון ננעל זמנית עקב ניסיונות כניסה כושלים.')
        setLockedRemainingSeconds(error.retryAfterSeconds ?? 0)
        return
      }
      setFormError('משהו השתבש. נסו שוב.')
    }
  }

  const isLocked = lockedRemainingSeconds !== null && lockedRemainingSeconds > 0
  const alertMessage =
    lockedRemainingSeconds === 0
      ? null
      : isLocked
        ? `${formError} ניתן לנסות שוב בעוד ${formatRemaining(lockedRemainingSeconds)}.`
        : formError

  return (
    <div className="login-page">
      <div className="login-page__card">
        <img src={abraLogo} alt="abra" className="login-page__logo" width={140} height={32} />
        <Form className="login" layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <h1>התחברות</h1>
          <p className="login-page__hint">הזינו את פרטי הכניסה שלכם</p>

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

          <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isLocked} block>
            התחבר
          </Button>
        </Form>
      </div>
    </div>
  )
}

export default Login
