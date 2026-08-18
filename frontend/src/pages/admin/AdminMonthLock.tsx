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

function AdminMonthLock() {
  const queryClient = useQueryClient()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
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

  return (
    <section>
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
                      <button
                        type="button"
                        className="admin-row-menu__btn"
                        onClick={() => unlockMutation.mutate(month)}
                      >
                        פתיחה
                      </button>
                    ) : (
                      <button type="button" className="admin-create__btn" onClick={() => lockMutation.mutate(month)}>
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
    </section>
  )
}

export default AdminMonthLock
