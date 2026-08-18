import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import kpiBriefcase from '../../assets/home/kpi-briefcase.svg'
import kpiClock from '../../assets/home/kpi-clock.svg'
import kpiSun from '../../assets/home/kpi-sun.svg'
import tagBuilding from '../../assets/home/tag-building.svg'
import tagNote from '../../assets/home/tag-note.svg'
import tagCheck from '../../assets/home/tag-check-green.svg'
import './AdminOverview.css'

const HUB = [
  {
    to: '/admin/users',
    title: 'משתמשים',
    detail: 'יצירה, עריכה והפעלה של חשבונות',
    icon: kpiSun,
  },
  {
    to: '/admin/clients',
    title: 'לקוחות',
    detail: 'ניהול לקוחות פעילים ולא פעילים',
    icon: tagBuilding,
  },
  {
    to: '/admin/projects',
    title: 'פרויקטים',
    detail: 'פרויקטים תחת לקוחות',
    icon: kpiBriefcase,
  },
  {
    to: '/admin/tasks',
    title: 'משימות',
    detail: 'משימות לדיווח שעות',
    icon: tagNote,
  },
  {
    to: '/admin/assignments',
    title: 'שיוכים',
    detail: 'שיוך עובדים למשימות',
    icon: tagCheck,
  },
  {
    to: '/admin/hour-settings',
    title: 'הגדרת דיווחי שעות',
    detail: 'סוג דיווח לכל פרויקט',
    icon: kpiClock,
  },
  {
    to: '/admin/month-lock',
    title: 'נעילת חודש',
    detail: 'נעילה ופתיחה של חודשי דיווח',
    icon: kpiClock,
  },
] as const

function AdminOverview() {
  const cards = useMemo(() => HUB, [])

  return (
    <section className="admin-hub">
      <h1 className="admin-hub__title">ניהול המערכת</h1>
      <p className="admin-hub__lead">בחרו תחום לניהול.</p>
      <div className="admin-hub__grid">
        {cards.map((card) => (
          <Link key={card.to} className="admin-hub__card" to={card.to}>
            <span className="admin-hub__icon" aria-hidden="true">
              <img src={card.icon} alt="" width={24} height={24} />
            </span>
            <div className="admin-hub__card-copy">
              <h2>{card.title}</h2>
              <p>{card.detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default AdminOverview
