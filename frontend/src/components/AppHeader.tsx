import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import UserMenu from './UserMenu'
import abraLogo from '../assets/home/abra-logo.svg'
import { homePath } from '../services/authPaths'
import { sessionStore } from '../services/sessionStore'
import './AppHeader.css'

interface Props {
  title: string
  children?: ReactNode
}

function AppHeader({ title, children }: Props) {
  const user = sessionStore((state) => state.user)

  return (
    <header className="app-header">
      <UserMenu />
      <Link className="app-header__brand" to={homePath(user)}>
        <img src={abraLogo} alt="abra" width={107} height={24} />
        <span className="app-header__divider" aria-hidden="true" />
        <span className="app-header__title">{title}</span>
      </Link>
      {children ? <div className="app-header__extra">{children}</div> : <span className="app-header__spacer" />}
    </header>
  )
}

export default AppHeader
