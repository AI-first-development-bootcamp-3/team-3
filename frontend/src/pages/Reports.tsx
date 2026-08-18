import { useCallback, useEffect, useState } from 'react'
import type { Dayjs } from 'dayjs'
import ManualReport, { type ManualReportHeaderMeta } from '../components/ManualReport'
import UserMenu from '../components/UserMenu'
import ManualReportModal from '../components/ManualReportModal'
import dayjs from '../services/dayjs'
import { listAbsences } from '../services/absences'
import { listReports } from '../services/reports'
import { sessionStore } from '../services/sessionStore'
import { rememberVisitWeekends } from '../lib/homeVisitWeekends'
import type { Absence, TimeReportListItem } from '../types'
import abraLogo from '../assets/home/abra-logo.svg'
import addCircle from '../assets/home/add-circle.svg'
import playIcon from '../assets/home/play.svg'
import arrowLeft from '../assets/home/arrow-left.svg'
import arrowRight from '../assets/home/arrow-right.svg'
import chevronSmall from '../assets/home/chevron-forward-small.svg'
import kpiClock from '../assets/home/kpi-clock.svg'
import kpiSun from '../assets/home/kpi-sun.svg'
import kpiHospital from '../assets/home/kpi-hospital.svg'
import kpiClose from '../assets/home/kpi-close-circle.svg'
import kpiBriefcase from '../assets/home/kpi-briefcase.svg'
import rowChevron from '../assets/home/row-chevron.svg'
import {
  DEMO_DAYS,
  DEMO_DAY_ICONS,
  DEMO_KPIS,
  DEMO_MONTH,
  DEMO_STATUS_ICONS,
  isHomeDemo,
  type DemoDay,
} from './homeDemoData'
import { buildHomeDays, weekendDatesForVisibleMonth } from './monthlyReportDays'
import { buildMonthKpis, type MonthKpis } from './monthKpis'
import './Reports.css'

const KPI_CARDS = [
  { label: 'שעות חודשיות', icon: kpiClock },
  { label: 'ימי חופשה', icon: kpiSun },
  { label: 'ימי מחלה', icon: kpiHospital },
  { label: 'דיווחים חסרים', icon: kpiClose },
  { label: 'פרויקטים מדווחים', icon: kpiBriefcase },
] as const

type ModalState = {
  isoDate: string
  sessionKey: number
  headerMeta: ManualReportHeaderMeta
  reports: TimeReportListItem[]
  absences: Absence[]
}

function headerFromDay(day: DemoDay): ManualReportHeaderMeta {
  return {
    status: day.status,
    tone: day.tone,
    tags: day.tags.map((tag) => ({ text: tag.text, icon: tag.icon })),
  }
}

function absencesCoveringDate(absences: Absence[], isoDate: string): Absence[] {
  return absences.filter((absence) => absence.startDate <= isoDate && absence.endDate >= isoDate)
}

function Reports() {
  const demo = isHomeDemo()
  const [month, setMonth] = useState<Dayjs>(() => (demo ? dayjs(DEMO_MONTH) : dayjs()))
  const [modal, setModal] = useState<ModalState | null>(null)
  const [savedDays, setSavedDays] = useState<DemoDay[]>([])
  const [monthReports, setMonthReports] = useState<TimeReportListItem[]>([])
  const [monthAbsences, setMonthAbsences] = useState<Absence[]>([])
  const [monthKpis, setMonthKpis] = useState<MonthKpis | null>(null)
  const [listLoading, setListLoading] = useState(
    () => !isHomeDemo() && Boolean(sessionStore.getState().user),
  )

  const fetchSavedDays = useCallback(
    async (targetMonth: Dayjs) => {
      if (demo || !sessionStore.getState().user) return [] as DemoDay[]
      const year = targetMonth.year()
      const monthNumber = targetMonth.month() + 1
      const today = dayjs().format('YYYY-MM-DD')
      const userId = sessionStore.getState().user?.id
      const [{ reports }, absences] = await Promise.all([
        listReports(monthNumber, year),
        listAbsences(monthNumber, year)
          .then((result) => result.absences)
          .catch(() => [] as Absence[]),
      ])
      setMonthReports(reports)
      setMonthAbsences(absences)
      setMonthKpis(buildMonthKpis({ reports, absences, year, month: monthNumber, today }))
      const remembered = userId ? rememberVisitWeekends(userId, today) : []
      return buildHomeDays({
        reports,
        absences,
        weekendDates: weekendDatesForVisibleMonth(year, monthNumber, today, remembered),
        monthPrefix: `${year}-${String(monthNumber).padStart(2, '0')}`,
      })
    },
    [demo],
  )

  const refreshSavedDays = useCallback(async () => {
    try {
      setSavedDays(await fetchSavedDays(month))
    } catch {
      setMonthReports([])
      setMonthAbsences([])
      setMonthKpis(null)
      setSavedDays([])
    }
  }, [fetchSavedDays, month])

  useEffect(() => {
    if (demo || !sessionStore.getState().user) return

    let cancelled = false
    void fetchSavedDays(month)
      .then((days) => {
        if (!cancelled) setSavedDays(days)
      })
      .catch(() => {
        if (!cancelled) {
          setMonthReports([])
          setMonthAbsences([])
          setMonthKpis(null)
          setSavedDays([])
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [demo, month, fetchSavedDays])

  const shiftMonth = (delta: number) => {
    if (!demo && sessionStore.getState().user) setListLoading(true)
    setMonth((current) => current.add(delta, 'month'))
  }

  const openManualReport = (isoDate?: string, headerMeta?: ManualReportHeaderMeta) => {
    const date = isoDate ?? dayjs().format('YYYY-MM-DD')
    setModal({
      isoDate: date,
      sessionKey: Date.now(),
      headerMeta: headerMeta ?? { status: 'חסר', tone: 'missing', tags: [] },
      reports: monthReports.filter((report) => report.date === date),
      absences: absencesCoveringDate(monthAbsences, date),
    })
  }

  const closeManualReport = () => setModal(null)

  const renderDayRows = (days: DemoDay[]) => (
    <ul className="home-shell__days">
      {days.map((day) => (
        <li key={day.isoDate}>
          <button
            type="button"
            className="home-shell__day"
            onClick={() => openManualReport(day.isoDate, headerFromDay(day))}
          >
            <div className="home-shell__day-main">
              <div className="home-shell__day-date">
                <span className="home-shell__day-icon" aria-hidden="true">
                  <img src={day.weekend ? DEMO_DAY_ICONS.weekend : DEMO_DAY_ICONS.workday} alt="" />
                </span>
                <span>{day.date}</span>
              </div>
              <div className="home-shell__day-tags">
                <span className={`home-shell__tag home-shell__tag--${day.tone}`}>
                  {day.status}
                  {day.tone !== 'weekend' && day.tone !== 'absence' ? (
                    <img src={DEMO_STATUS_ICONS[day.tone]} alt="" />
                  ) : null}
                </span>
                {day.tags.length > 0 ? <span className="home-shell__tag-sep" aria-hidden="true" /> : null}
                {day.tags.map((tag) => (
                  <span key={tag.text} className="home-shell__tag">
                    {tag.text}
                    <img src={tag.icon} alt="" />
                  </span>
                ))}
              </div>
            </div>
            <span className="home-shell__day-chevron" aria-hidden="true">
              <img src={rowChevron} alt="" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={`reports-layout${modal ? ' reports-layout--panel-open' : ''}`}>
      <div className="home-shell">
        <header className="home-shell__header">
          <div className="home-shell__toolbar">
            <UserMenu />
            <div className="home-shell__brand">
              <img src={abraLogo} alt="abra" className="home-shell__logo" width={107} height={24} />
              <span className="home-shell__brand-divider" aria-hidden="true" />
              <h1 className="home-shell__title">דיווח שעות</h1>
            </div>
          </div>

          <div className="home-shell__month" role="group" aria-label="בחירת חודש">
            <button
              type="button"
              className="home-shell__month-btn"
              aria-label="חודש קודם"
              onClick={() => shiftMonth(-1)}
            >
              <img src={arrowRight} alt="" className="home-shell__month-icon" width={20} height={20} />
            </button>
            <p className="home-shell__month-label" data-testid="month-label">
              {month.format('MMMM')}
            </p>
            <button
              type="button"
              className="home-shell__month-btn"
              aria-label="חודש הבא"
              onClick={() => shiftMonth(1)}
            >
              <img src={arrowLeft} alt="" className="home-shell__month-icon" width={20} height={20} />
            </button>
          </div>

          <div className="home-shell__actions">
            <button type="button" className="home-shell__cta" onClick={() => openManualReport()}>
              דיווח ידני
              <span className="home-shell__cta-icon" aria-hidden="true">
                <img src={addCircle} alt="" width={24} height={24} />
              </span>
            </button>
            <button
              type="button"
              className="home-shell__clock"
              disabled
              aria-disabled="true"
              title="בקרוב"
            >
              הפעלת שעון
              <span className="home-shell__sr-only">בקרוב</span>
              <span className="home-shell__cta-icon home-shell__cta-icon--clock" aria-hidden="true">
                <img src={playIcon} alt="" width={24} height={24} />
              </span>
            </button>
          </div>
        </header>

        <div className="home-shell__body">
          <section className="home-shell__kpis" aria-label="סיכום חודשי">
            {KPI_CARDS.map((card) => {
              const value = demo ? DEMO_KPIS[card.label] : monthKpis?.[card.label]
              return (
                <article key={card.label} className="home-shell__kpi">
                  <div className="home-shell__kpi-top">
                    <span className="home-shell__kpi-icon" aria-hidden="true">
                      <img src={card.icon} alt="" width={24} height={24} />
                    </span>
                    <h2>{card.label}</h2>
                  </div>
                  {value ? (
                    <div className="home-shell__kpi-value">
                      <strong>{value.value}</strong>
                      <span>{value.caption}</span>
                    </div>
                  ) : (
                    <p>אין נתונים עדיין</p>
                  )}
                </article>
              )
            })}
          </section>
          <section className="home-shell__daily">
            <div className="home-shell__daily-head">
              <div>
                <h2>פירוט יומי</h2>
                <p className="home-shell__daily-sub">
                  רשימת הדיווחים לחודש {month.format('MMMM YYYY')}
                </p>
              </div>
              <button type="button" className="home-shell__filter" disabled aria-disabled="true">
                כל הדיווחים
                <span className="home-shell__filter-icon" aria-hidden="true">
                  <img src={chevronSmall} alt="" width={6} height={12} />
                </span>
              </button>
            </div>
            {demo ? (
              renderDayRows(DEMO_DAYS)
            ) : listLoading ? (
              <p className="home-shell__daily-empty">טוען דיווחים…</p>
            ) : savedDays.length > 0 ? (
              renderDayRows(savedDays)
            ) : (
              <p className="home-shell__daily-empty">אין דיווחים להצגה</p>
            )}
          </section>
        </div>
      </div>

      <ManualReportModal open={modal !== null} onClose={closeManualReport} labelId="manual-report-day-title">
        {modal ? (
          <ManualReport
            key={modal.sessionKey}
            initialDate={modal.isoDate}
            initialReports={modal.reports}
            initialAbsences={modal.absences}
            headerMeta={modal.headerMeta}
            onClose={closeManualReport}
            onSaved={refreshSavedDays}
          />
        ) : null}
      </ManualReportModal>
    </div>
  )
}

export default Reports
