import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dayjs } from 'dayjs'
import ManualReport, { type ManualReportHeaderMeta } from '../components/ManualReport'
import UserMenu from '../components/UserMenu'
import ManualReportModal, { SLIDE_MS } from '../components/ManualReportModal'
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
import { useWorkClock } from '../hooks/useWorkClock'
import WorkClockStopModal from '../components/WorkClockStopModal'
import ReportStatusFilterMenu from './ReportStatusFilterMenu'
import { filterDaysByStatus, type ReportStatusFilter } from './reportStatusFilter'
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

/** Everything one month's fetch produces, so the fetch itself can stay free of
 * setState and the caller can apply it all at once. */
type MonthSnapshot = {
  reports: TimeReportListItem[]
  absences: Absence[]
  kpis: MonthKpis | null
  days: DemoDay[]
  monthLocked: boolean
}

const EMPTY_MONTH: MonthSnapshot = { reports: [], absences: [], kpis: null, days: [], monthLocked: false }

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
  const [panelOpen, setPanelOpen] = useState(false)
  const [savedDays, setSavedDays] = useState<DemoDay[]>([])
  const [monthReports, setMonthReports] = useState<TimeReportListItem[]>([])
  const [monthAbsences, setMonthAbsences] = useState<Absence[]>([])
  const [monthKpis, setMonthKpis] = useState<MonthKpis | null>(null)
  const [monthLocked, setMonthLocked] = useState(false)
  const [listLoading, setListLoading] = useState(
    () => !isHomeDemo() && Boolean(sessionStore.getState().user),
  )
  // Deliberately not reset by the month effect: an active filter carries across
  // month navigation, and starts clean only on a fresh mount.
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all')
  const unmountTimerRef = useRef<number | null>(null)
  const signedIn = !demo && Boolean(sessionStore.getState().user)
  const clock = useWorkClock({ enabled: signedIn })

  const cancelPendingUnmount = () => {
    if (unmountTimerRef.current === null) return
    window.clearTimeout(unmountTimerRef.current)
    unmountTimerRef.current = null
  }

  useEffect(() => cancelPendingUnmount, [])

  const fetchMonth = useCallback(
    async (targetMonth: Dayjs): Promise<MonthSnapshot> => {
      if (demo || !sessionStore.getState().user) return EMPTY_MONTH
      const year = targetMonth.year()
      const monthNumber = targetMonth.month() + 1
      const today = dayjs().format('YYYY-MM-DD')
      const userId = sessionStore.getState().user?.id
      const [{ reports, monthLocked = false }, absences] = await Promise.all([
        listReports(monthNumber, year),
        listAbsences(monthNumber, year)
          .then((result) => result.absences)
          .catch(() => [] as Absence[]),
      ])
      const remembered = userId ? rememberVisitWeekends(userId, today) : []
      return {
        reports,
        absences,
        monthLocked,
        kpis: buildMonthKpis({ reports, absences, year, month: monthNumber, today }),
        days: buildHomeDays({
          reports,
          absences,
          weekendDates: weekendDatesForVisibleMonth(year, monthNumber, today, remembered),
          monthPrefix: `${year}-${String(monthNumber).padStart(2, '0')}`,
        }),
      }
    },
    [demo],
  )

  // Kept out of fetchMonth so that every setState below happens in a resolved
  // continuation. A fetch that set state itself would be a synchronous setState
  // the moment the effect called it, which cascades renders.
  const applyMonth = useCallback((snapshot: MonthSnapshot) => {
    setMonthReports(snapshot.reports)
    setMonthAbsences(snapshot.absences)
    setMonthKpis(snapshot.kpis)
    setSavedDays(snapshot.days)
    setMonthLocked(snapshot.monthLocked)
  }, [])

  const refreshSavedDays = useCallback(async () => {
    try {
      applyMonth(await fetchMonth(month))
    } catch {
      applyMonth(EMPTY_MONTH)
    }
    await clock.refreshSession()
  }, [applyMonth, clock.refreshSession, fetchMonth, month])

  useEffect(() => {
    if (demo || !sessionStore.getState().user) return

    let cancelled = false
    void fetchMonth(month)
      .then((snapshot) => {
        if (!cancelled) applyMonth(snapshot)
      })
      .catch(() => {
        if (!cancelled) applyMonth(EMPTY_MONTH)
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyMonth, demo, month, fetchMonth])

  const shiftMonth = (delta: number) => {
    if (!demo && sessionStore.getState().user) setListLoading(true)
    setMonth((current) => current.add(delta, 'month'))
  }

  const openManualReport = (isoDate?: string, headerMeta?: ManualReportHeaderMeta) => {
    const date = isoDate ?? dayjs().format('YYYY-MM-DD')
    // Reopening during a slide-out would otherwise be undone by the pending
    // unmount from the close that is still animating.
    cancelPendingUnmount()
    setPanelOpen(true)
    setModal((current) => ({
      isoDate: date,
      // A counter, not a clock: the panel is keyed on this so it remounts when
      // the user picks a different day while it is already open, and two opens
      // can easily land within the same millisecond.
      sessionKey: (current?.sessionKey ?? 0) + 1,
      headerMeta: headerMeta ?? { status: 'חסר', tone: 'missing', tags: [] },
      reports: monthReports.filter((report) => report.date === date),
      absences: absencesCoveringDate(monthAbsences, date),
    }))
  }

  // The panel's content has to stay rendered while it slides out, so closing
  // flips the panel shut now and drops the content once the animation is over.
  const closeManualReport = () => {
    setPanelOpen(false)
    cancelPendingUnmount()
    unmountTimerRef.current = window.setTimeout(() => {
      unmountTimerRef.current = null
      setModal(null)
    }, SLIDE_MS)
  }

  const renderDayRows = (days: DemoDay[]) => (
    <ul className="home-shell__days">
      {days.map((day) => (
        <li key={day.isoDate}>
          <button
            type="button"
            className={`home-shell__day${monthLocked ? ' home-shell__day--locked' : ''}`}
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

  // Filtering happens here, at the point of render: `savedDays`, `monthReports`,
  // and `monthKpis` all stay whole-month, so the KPI cards and the day panel are
  // untouched by the filter.
  const visibleDays = filterDaysByStatus(demo ? DEMO_DAYS : savedDays, statusFilter)
  const filteredToNothing = visibleDays.length === 0 && statusFilter !== 'all'

  return (
    <div className={`reports-layout${panelOpen ? ' reports-layout--panel-open' : ''}`}>
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
            {clock.isActive ? (
              <div className="home-shell__clock-running">
                <span className="home-shell__clock-elapsed" data-testid="clock-elapsed" aria-live="polite">
                  {clock.elapsedLabel}
                </span>
                <button
                  type="button"
                  className="home-shell__clock home-shell__clock--active"
                  onClick={() => void clock.handleStop()}
                  disabled={clock.actionLoading}
                >
                  עצור שעון
                </button>
              </div>
            ) : clock.isAwaitingConfirm ? null : (
              <button
                type="button"
                className="home-shell__clock home-shell__clock--idle"
                onClick={() => void clock.handleStart()}
                disabled={!signedIn || clock.actionLoading || clock.loading}
              >
                הפעלת שעון
                <span className="home-shell__cta-icon home-shell__cta-icon--clock" aria-hidden="true">
                  <img src={playIcon} alt="" width={24} height={24} />
                </span>
              </button>
            )}
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
              <ReportStatusFilterMenu value={statusFilter} onChange={setStatusFilter} />
            </div>
            {!demo && listLoading ? (
              <p className="home-shell__daily-empty">טוען דיווחים…</p>
            ) : visibleDays.length > 0 ? (
              renderDayRows(visibleDays)
            ) : filteredToNothing ? (
              <p className="home-shell__daily-empty">לא נמצאו ימים התואמים לסינון</p>
            ) : (
              <p className="home-shell__daily-empty">אין דיווחים להצגה</p>
            )}
          </section>
        </div>
      </div>

      {modal ? (
        <ManualReportModal
          open={panelOpen}
          onClose={closeManualReport}
          labelId="manual-report-day-title"
        >
          <ManualReport
            key={modal.sessionKey}
            initialDate={modal.isoDate}
            initialReports={modal.reports}
            initialAbsences={modal.absences}
            headerMeta={modal.headerMeta}
            onClose={closeManualReport}
            onSaved={refreshSavedDays}
          />
        </ManualReportModal>
      ) : null}

      {clock.confirmOpen && clock.session && clock.isAwaitingConfirm ? (
        <WorkClockStopModal
          open
          session={clock.session}
          loading={clock.actionLoading}
          onCancel={() => void clock.handleDiscard()}
          onConfirmed={() => {
            clock.clearSession()
            void refreshSavedDays()
          }}
        />
      ) : null}
    </div>
  )
}

export default Reports
