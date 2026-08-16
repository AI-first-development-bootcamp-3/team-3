import { useState } from 'react'
import type { Dayjs } from 'dayjs'
import ReportEntryForm from '../components/ReportEntryForm'
import dayjs from '../services/dayjs'
import './Reports.css'

const KPI_LABELS = [
  'שעות חודשיות',
  'ימי חופשה',
  'ימי מחלה',
  'דיווחים חסרים',
  'פרויקטים מדווחים',
] as const

function Reports() {
  const [month, setMonth] = useState<Dayjs>(() => dayjs())
  const [showEntry, setShowEntry] = useState(false)

  return (
    <div className="home-shell">
      <header className="home-shell__header">
        <p className="home-shell__wordmark">abra</p>
        <h1 className="home-shell__title">דיווח שעות</h1>
      </header>

      <div className="home-shell__month">
        <button
          type="button"
          className="home-shell__month-btn"
          aria-label="חודש קודם"
          onClick={() => setMonth((current) => current.subtract(1, 'month'))}
        >
          ‹
        </button>
        <p className="home-shell__month-label" data-testid="month-label">
          {month.format('MMMM YYYY')}
        </p>
        <button
          type="button"
          className="home-shell__month-btn"
          aria-label="חודש הבא"
          onClick={() => setMonth((current) => current.add(1, 'month'))}
        >
          ›
        </button>
      </div>

      <div className="home-shell__actions">
        <button type="button" className="home-shell__cta" onClick={() => setShowEntry(true)}>
          דיווח ידני
        </button>
        <button type="button" className="home-shell__clock" disabled aria-disabled="true">
          הפעלת שעון
          <span className="home-shell__soon">בקרוב</span>
        </button>
      </div>

      {showEntry ? (
        <>
          <button type="button" className="home-shell__back" onClick={() => setShowEntry(false)}>
            חזרה
          </button>
          <ReportEntryForm />
        </>
      ) : (
        <>
          <section className="home-shell__kpis" aria-label="סיכום חודשי">
            {KPI_LABELS.map((label) => (
              <article key={label} className="home-shell__kpi">
                <h2>{label}</h2>
                <p>אין נתונים עדיין</p>
              </article>
            ))}
          </section>
          <section className="home-shell__daily">
            <h2>פירוט יומי</h2>
            <p>אין דיווחים להצגה</p>
          </section>
        </>
      )}
    </div>
  )
}

export default Reports
