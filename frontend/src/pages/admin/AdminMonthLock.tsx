import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMonthLocks, lockMonth, unlockMonth } from '../../services/adminMonthLocks'
import './AdminAssignments.css'

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

type PendingLock = { month: number; locked: boolean }

function AdminMonthLock() {
  const queryClient = useQueryClient()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [pending, setPending] = useState<PendingLock | null>(null)
  const locksQuery = useQuery({
    queryKey: ['adminMonthLocks', year],
    queryFn: () => listMonthLocks(year),
  })
  const lockedMonths = useMemo(
    () => new Set((locksQuery.data ?? []).map((lock) => lock.month)),
    [locksQuery.data],
  )

  const lockMutation = useMutation({
    mutationFn: (month: number) => lockMonth(year, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminMonthLocks', year] }),
  })
  const unlockMutation = useMutation({
    mutationFn: (month: number) => unlockMonth(year, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminMonthLocks', year] }),
  })

  const pendingLabel = pending ? `${MONTH_NAMES[pending.month - 1]} ${year}` : ''
  const confirming = lockMutation.isPending || unlockMutation.isPending

  const confirmPending = async () => {
    if (!pending) return
    if (pending.locked) await unlockMutation.mutateAsync(pending.month)
    else await lockMutation.mutateAsync(pending.month)
    setPending(null)
  }

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">נעילת חודש</h1>
          <p className="admin-page__lead">חודש נעול חוסם דיווחי שעות והיעדרויות של עובדים לאותו חודש.</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <span className="admin-search__label">שנה</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || thisYear)}
              aria-label="שנה"
            />
          </label>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>חודש</th>
              <th>סטטוס</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {MONTH_NAMES.map((name, index) => {
              const month = index + 1
              const locked = lockedMonths.has(month)
              return (
                <tr key={month}>
                  <td>
                    {name} {year}
                  </td>
                  <td>{locked ? 'נעול' : 'פתוח'}</td>
                  <td>
                    {locked ? (
                      <button type="button" className="admin-link-btn" onClick={() => setPending({ month, locked: true })}>
                        פתיחה
                      </button>
                    ) : (
                      <button type="button" className="admin-create__btn" onClick={() => setPending({ month, locked: false })}>
                        נעילה
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pending ? (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!confirming) setPending(null)
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-lock-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="month-lock-confirm-title">
              {pending.locked ? `לפתוח את חודש ${pendingLabel}?` : `לנעול את חודש ${pendingLabel}?`}
            </h2>
            <p className="admin-modal__hint">
              {pending.locked
                ? 'עובדים יוכלו שוב לדווח שעות והיעדרויות בחודש זה.'
                : 'עובדים לא יוכלו לדווח שעות או היעדרויות בחודש זה עד שהחודש ייפתח מחדש.'}
            </p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-confirm-actions__cancel" disabled={confirming} onClick={() => setPending(null)}>
                ביטול
              </button>
              <button
                type="button"
                className={pending.locked ? 'admin-create__btn' : 'admin-confirm-actions__delete'}
                disabled={confirming}
                onClick={() => {
                  void confirmPending()
                }}
              >
                {pending.locked ? 'פתיחה' : 'נעילה'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminMonthLock
