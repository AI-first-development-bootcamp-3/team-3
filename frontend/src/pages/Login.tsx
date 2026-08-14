import { Button } from 'antd'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { sessionStore } from '../services/sessionStore'
import type { User } from '../types'

const EMPLOYEE: User = {
  id: '1',
  fullName: 'Employee Placeholder',
  email: 'employee@example.com',
  userType: 'regular',
  active: true,
}

const ADMIN: User = {
  id: '2',
  fullName: 'Admin Placeholder',
  email: 'admin@example.com',
  userType: 'admin',
  active: true,
}

/**
 * Placeholder sign-in - no real backend auth exists yet (SCRUM-4, untouched).
 * Exists so RequireAuth/RequireRole (SCRUM-40) can be built and verified now.
 * Replaced wholesale when real auth lands.
 */
function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const signIn = (user: User) => {
    sessionStore.getState().setSession(user, `fake-token-${user.id}`)
    navigate(from, { replace: true })
  }

  return (
    <div>
      <h1>Login (placeholder)</h1>
      <Button onClick={() => signIn(EMPLOYEE)}>Sign in as employee</Button>
      <Button onClick={() => signIn(ADMIN)}>Sign in as admin</Button>
    </div>
  )
}

export default Login
