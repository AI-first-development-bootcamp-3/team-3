import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from '../../services/dayjs'
import { listUsers } from '../../services/adminUsers'
import {
  deleteAdminEmployeeReports,
  getAdminReportingOptions,
  listAdminEmployeeReportAudits,
  listAdminEmployeeReports,
  saveAdminEmployeeReportBatch,
  type AdminTimeReportAudit,
} from '../../services/adminReports'
import AdminPillOverflow from '../../components/AdminPillOverflow'
import ManualReport from '../../components/ManualReport'
import ManualReportModal, { SLIDE_MS } from '../../components/ManualReportModal'
import type { CreateReportBatchInput, TimeReportListItem } from '../../types'
import { auditChangeLabels } from './auditChangeLabels'
import './AdminAssignments.css'
import './AdminEmployeeReports.css'

const MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
]

type Editor = {
  isoDate: string
  reports: TimeReportListItem[]
  sessionKey: number
}

function groupDays(reports: TimeReportListItem[]): { isoDate: string; hours: number; projects: string[] }[] {
  const byDate = new Map<string, TimeReportListItem[]>()
  for (const report of reports) {
    const bucket = byDate.get(report.date) ?? []
    bucket.push(report)
    byDate.set(report.date, bucket)
  }
  return [...byDate.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([isoDate, rows]) => ({
      isoDate,
      hours: rows.reduce((sum, row) => sum + row.hours, 0),
      projects: [...new Set(rows.map((row) => row.projectName))],
    }))
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const VISIBLE_AUDIT_PILLS = 2

function AuditActionPills({ audit }: { audit: AdminTimeReportAudit }) {
  const labels = auditChangeLabels(audit)
  const visible = labels.slice(0, VISIBLE_AUDIT_PILLS)
  const extra = labels.slice(VISIBLE_AUDIT_PILLS)
  const allLabels = labels.join(' · ')

  return (
    <div className="admin-pills admin-audit-actions" aria-label={allLabels}>
      {visible.map((label) => (
        <span key={label} className="admin-pill admin-audit-pill">
          {label}
        </span>
      ))}
      {extra.length > 0 ? (
        <AdminPillOverflow count={extra.length} label={`עוד ${extra.length} פעולות`} pillClassName="admin-audit-more">
          {labels.map((label) => (
            <span key={label} className="admin-pill admin-audit-pill">
              {label}
            </span>
          ))}
        </AdminPillOverflow>
      ) : null}
    </div>
  )
}

function AdminEmployeeReports() {
  const queryClient = useQueryClient()
  const today = dayjs()
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(today.month() + 1)
  const [year, setYear] = useState(today.year())
  const [newDate, setNewDate] = useState(`${today.year()}-${String(today.month() + 1).padStart(2, '0')}-01`)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const closeTimerRef = useRef<number>(undefined)

  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: listUsers })
  const reportsQuery = useQuery({
    queryKey: ['adminEmployeeReports', employeeId, month, year],
    queryFn: () => listAdminEmployeeReports(employeeId, month, year),
    enabled: Boolean(employeeId),
  })
  const auditsQuery = useQuery({
    queryKey: ['adminEmployeeReportAudits', employeeId, month, year],
    queryFn: () => listAdminEmployeeReportAudits(employeeId, month, year),
    enabled: Boolean(employeeId),
  })

  const days = useMemo(() => groupDays(reportsQuery.data?.reports ?? []), [reportsQuery.data])
  const employees = usersQuery.data ?? []

  const loadOptions = useCallback(() => getAdminReportingOptions(employeeId), [employeeId])
  const saveBatch = useCallback(
    (body: CreateReportBatchInput) =>
      saveAdminEmployeeReportBatch({
        userId: employeeId,
        ...body,
      }),
    [employeeId],
  )
  const deleteDay = useCallback(
    (date: string) => deleteAdminEmployeeReports(employeeId, date),
    [employeeId],
  )

  const openDay = (isoDate: string, reports: TimeReportListItem[]) => {
    window.clearTimeout(closeTimerRef.current)
    setEditor({ isoDate, reports, sessionKey: Date.now() })
    setPanelOpen(true)
  }

  const closeEditor = () => {
    setPanelOpen(false)
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setEditor(null), SLIDE_MS)
  }

  const refreshEmployeeMonth = () => {
    void queryClient.invalidateQueries({ queryKey: ['adminEmployeeReports', employeeId, month, year] })
    void queryClient.invalidateQueries({ queryKey: ['adminEmployeeReportAudits', employeeId, month, year] })
  }

  const reportsByDate = useMemo(() => {
    const map = new Map<string, TimeReportListItem[]>()
    for (const report of reportsQuery.data?.reports ?? []) {
      const bucket = map.get(report.date) ?? []
      bucket.push(report)
      map.set(report.date, bucket)
    }
    return map
  }, [reportsQuery.data])

  return (
    <section>
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">דיווחי עובדים</h1>
          <p className="admin-page__lead">
            עריכת דיווחי שעות של עובד אחר. כל שמירה או מחיקה נרשמת ביומן השינויים.
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <label className="admin-search">
          <span className="admin-search__label">עובד</span>
          <select
            aria-label="עובד"
            value={employeeId}
            onChange={(event) => {
              setEmployeeId(event.target.value)
              closeEditor()
            }}
          >
            <option value="">בחרו עובד</option>
            {employees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
                {user.isActive ? '' : ' (לא פעיל)'}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-search">
          <span className="admin-search__label">חודש</span>
          <select aria-label="חודש" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-search">
          <span className="admin-search__label">שנה</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            aria-label="שנה"
            onChange={(event) => setYear(Number(event.target.value) || today.year())}
          />
        </label>
      </div>

      {!employeeId ? (
        <p className="admin-empty">בחרו עובד כדי לראות ולערוך את הדיווחים שלו.</p>
      ) : (
        <>
          <div className="admin-reports__new">
            <label>
              <span>יום חדש</span>
              <input type="date" aria-label="יום חדש" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
            </label>
            <button
              type="button"
              className="admin-create__btn"
              onClick={() => newDate && openDay(newDate, reportsByDate.get(newDate) ?? [])}
            >
              פתיחת יום
            </button>
          </div>

          <h2 className="admin-reports__section">ימים מדווחים</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>שעות</th>
                  <th>פרויקטים</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr>
                    <td colSpan={4}>טוען…</td>
                  </tr>
                ) : days.length === 0 ? (
                  <tr>
                    <td colSpan={4}>אין דיווחים בחודש הזה</td>
                  </tr>
                ) : (
                  days.map((day) => (
                    <tr key={day.isoDate}>
                      <td>{dayjs(day.isoDate).format('DD/MM/YYYY')}</td>
                      <td>{formatHours(day.hours)}</td>
                      <td>{day.projects.join(', ')}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-row-menu__btn"
                          onClick={() => openDay(day.isoDate, reportsByDate.get(day.isoDate) ?? [])}
                        >
                          עריכה
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="admin-reports__section">יומן שינויים</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>תאריך דיווח</th>
                  <th>פעולה</th>
                  <th>מנהל</th>
                  <th>זמן</th>
                </tr>
              </thead>
              <tbody>
                {auditsQuery.isLoading ? (
                  <tr>
                    <td colSpan={4}>טוען…</td>
                  </tr>
                ) : (auditsQuery.data?.audits ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4}>אין שינויים מתועדים לחודש הזה</td>
                  </tr>
                ) : (
                  (auditsQuery.data?.audits ?? []).map((audit) => (
                    <tr key={audit.id}>
                      <td>{dayjs(audit.date).format('DD/MM/YYYY')}</td>
                      <td>
                        <AuditActionPills audit={audit} />
                      </td>
                      <td>{audit.actorName}</td>
                      <td>{dayjs(audit.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editor ? (
        <ManualReportModal open={panelOpen} onClose={closeEditor} labelId="manual-report-day-title">
          <ManualReport
            key={editor.sessionKey}
            onClose={closeEditor}
            onSaved={() => {
              refreshEmployeeMonth()
              closeEditor()
            }}
            initialDate={editor.isoDate}
            initialReports={editor.reports}
            allowAbsenceTab={false}
            loadOptions={loadOptions}
            saveBatch={saveBatch}
            deleteDay={deleteDay}
          />
        </ManualReportModal>
      ) : null}
    </section>
  )
}

export default AdminEmployeeReports
