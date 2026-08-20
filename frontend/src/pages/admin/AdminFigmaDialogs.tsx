import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../services/adminClients'
import { createProject } from '../../services/adminProjects'
import { createTask } from '../../services/adminTasks'
import { listUsers, type AdminUser } from '../../services/adminUsers'
import './AdminAssignments.css'

export interface AssignmentRow {
  key: string
  taskId: string
  clientId: string
  projectId: string
  client: string
  project: string
  task: string
  workers: string[]
  workerIds: string[]
}

export type CreateKind = 'client' | 'project' | 'task'
export type DeleteKind = 'client' | 'project' | 'task'
export type EditKind = 'client' | 'project' | 'task'

export interface NamedOption {
  id: string
  name: string
}

export interface ProjectOption {
  id: string
  name: string
  clientId: string
}

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="admin-modal__close" aria-label="סגירה" onClick={onClick}>
      ×
    </button>
  )
}

function Overlay({
  children,
  labelledBy,
  onClose,
  wide,
}: {
  children: ReactNode
  labelledBy: string
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={wide ? 'admin-modal admin-modal--wide' : 'admin-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 16c1.2-2.4 3.1-3.5 5.5-3.5S14.3 13.6 15.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.5v1.6M10 14.9v1.6M3.5 10h1.6M14.9 10h1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlusPersonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 15c.8-2 2.4-3 4.5-3s3.7 1 4.5 3M14 7v6M11 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 6h10M8 6V5h4v1M7 6l.6 9h4.8L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.2 3.4a1.2 1.2 0 0 1 1.7 1.7L7 13l-2.8.7.7-2.8 8.3-7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusInCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CreateEntityDialog({
  kind,
  clients,
  projects,
  onClose,
  onCreated,
}: {
  kind: CreateKind
  clients: NamedOption[]
  projects: ProjectOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState(kind === 'project' ? '' : (clients[0]?.id ?? ''))
  const [projectId, setProjectId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: listUsers })
  const managers = (usersQuery.data ?? []).filter((user: AdminUser) => user.isActive)

  const clientProjects = projects.filter((item) => item.clientId === clientId)
  const title = kind === 'client' ? 'יצירת לקוח' : kind === 'project' ? 'יצירת פרויקט' : 'יצירת משימה'
  const submitLabel = kind === 'client' ? 'צור לקוח' : kind === 'project' ? 'צור פרויקט' : 'צור משימה'
  const ready =
    kind === 'client'
      ? name.trim().length > 0
      : kind === 'project'
        ? name.trim().length > 0 &&
          clientId.length > 0 &&
          managerId.length > 0 &&
          startDate.length > 0 &&
          endDate.length > 0 &&
          endDate >= startDate
        : name.trim().length > 0 && clientId.length > 0 && projectId.length > 0

  const save = async () => {
    if (!ready || saving) return
    setError(null)
    setSaving(true)
    try {
      if (kind === 'client') {
        await createClient({ name: name.trim(), contactDetails: description.trim() || undefined })
      } else if (kind === 'project') {
        await createProject({
          name: name.trim(),
          clientId,
          managerId,
          startDate,
          endDate,
          description: description.trim(),
        })
      } else {
        await createTask({ name: name.trim(), projectId })
      }
      onCreated()
      onClose()
    } catch {
      setError('לא הצלחנו לשמור. נסו שוב.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay labelledBy="admin-create-title" onClose={onClose}>
      <div className="admin-modal__top">
        <div className="admin-modal__heading">
          <span className={kind === 'project' ? 'admin-modal__icon admin-modal__icon--tile' : 'admin-modal__icon'}>
            {kind === 'client' ? <PersonIcon /> : kind === 'project' ? <PlusInCircleIcon /> : <GearIcon />}
          </span>
          <div>
            <h2 id="admin-create-title">{title}</h2>
            {kind === 'project' ? (
              <p className="admin-modal__hint">כאן תיצור את הפרויקט החדש שיופיע במערכת</p>
            ) : null}
          </div>
        </div>
        <CloseX onClick={onClose} />
      </div>

      {error ? <p className="admin-modal__error">{error}</p> : null}

      <label className="admin-field">
        <span>{kind === 'client' ? 'שם הלקוח' : kind === 'project' ? 'שם הפרויקט' : 'שם המשימה'}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === 'project' ? 'צור שם לפרויקט' : undefined}
          aria-label={kind === 'client' ? 'שם הלקוח' : kind === 'project' ? 'שם הפרויקט' : 'שם המשימה'}
        />
      </label>

      {kind !== 'client' ? (
        <label className="admin-field">
          <span>{kind === 'project' ? 'שם הלקוח' : 'בחר לקוח'}</span>
          <select
            aria-label={kind === 'project' ? 'שם הלקוח' : 'בחר לקוח'}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value)
              setProjectId('')
            }}
          >
            <option value="">{kind === 'project' ? 'מה שם הלקוח' : 'בחירה'}</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'project' ? (
        <label className="admin-field">
          <span>שייך מנהל ראשי לפרויקט</span>
          <select aria-label="שייך מנהל ראשי לפרויקט" value={managerId} onChange={(event) => setManagerId(event.target.value)}>
            <option value="">בחר מנהל</option>
            {managers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'task' ? (
        <label className="admin-field">
          <span>בחר פרויקט</span>
          <select aria-label="בחר פרויקט" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">בחירה</option>
            {clientProjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'project' ? (
        <div className="admin-field__row">
          <label className="admin-field">
            <span>תאריך התחלה</span>
            <input
              type="date"
              aria-label="תאריך התחלה"
              value={startDate}
              onChange={(event) => {
                const next = event.target.value
                setStartDate(next)
                if (endDate && next && endDate < next) setEndDate('')
              }}
            />
          </label>
          <label className="admin-field">
            <span>תאריך סיום</span>
            <input
              type="date"
              aria-label="תאריך סיום"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <label className="admin-field">
        <span>
          {kind === 'client' ? 'תיאור הלקוח' : kind === 'project' ? 'תיאור הפרויקט' : 'תיאור המשימה'}
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={kind === 'project' ? 'תאר בקצרה את הפרויקט' : undefined}
        />
      </label>

      <button
        type="button"
        className={ready ? 'admin-modal__submit admin-modal__submit--ready' : 'admin-modal__submit'}
        disabled={!ready || saving}
        onClick={() => {
          void save()
        }}
      >
        {kind === 'project' ? <PlusInCircleIcon /> : null}
        {submitLabel}
      </button>
    </Overlay>
  )
}

export function EditEntityDialog({
  kind,
  initialName,
  onClose,
  onSave,
}: {
  kind: EditKind
  initialName: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const title = kind === 'client' ? 'עריכת לקוח' : kind === 'project' ? 'עריכת פרויקט' : 'עריכת משימה'
  const label = kind === 'client' ? 'שם הלקוח' : kind === 'project' ? 'שם הפרויקט' : 'שם המשימה'
  const ready = name.trim().length > 0

  return (
    <Overlay labelledBy="admin-edit-title" onClose={onClose}>
      <div className="admin-modal__top">
        <div className="admin-modal__heading">
          <span className="admin-modal__icon">
            <PencilIcon />
          </span>
          <div>
            <h2 id="admin-edit-title">{title}</h2>
          </div>
        </div>
        <CloseX onClick={onClose} />
      </div>
      {error ? <p className="admin-modal__error">{error}</p> : null}
      <label className="admin-field">
        <span>{label}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label={label} />
      </label>
      <button
        type="button"
        className={ready ? 'admin-modal__submit admin-modal__submit--ready' : 'admin-modal__submit'}
        disabled={!ready || saving}
        onClick={() => {
          void (async () => {
            if (!ready || saving) return
            setError(null)
            setSaving(true)
            try {
              await onSave(name.trim())
              onClose()
            } catch {
              setError('לא הצלחנו לשמור. נסו שוב.')
            } finally {
              setSaving(false)
            }
          })()
        }}
      >
        שמירה
      </button>
    </Overlay>
  )
}

export function DeleteEntityDialog({
  kind,
  row,
  onCancel,
  onConfirm,
}: {
  kind: DeleteKind
  row: AssignmentRow
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const title = kind === 'client' ? 'מחיקת לקוח' : kind === 'project' ? 'מחיקת פרויקט' : 'מחיקת משימה'
  const hint =
    kind === 'client'
      ? 'האם אתה בטוח שברצונך למחוק לקוח זה?'
      : kind === 'project'
        ? 'האם אתה בטוח שברצונך למחוק פרויקט זה?'
        : 'האם אתה בטוח שברצונך למחוק משימה זו?'

  return (
    <Overlay labelledBy="admin-delete-title" onClose={onCancel}>
      <div className="admin-modal__top">
        <div className="admin-modal__heading">
          <span className="admin-modal__icon admin-modal__icon--danger">
            <TrashIcon />
          </span>
          <div>
            <h2 id="admin-delete-title">{title}</h2>
            <p className="admin-modal__hint">{hint}</p>
          </div>
        </div>
      </div>
      {error ? <p className="admin-modal__error">{error}</p> : null}
      <p className="admin-modal__hint">
        {row.client} · {row.project} · {row.task}
      </p>
      <div className="admin-confirm-actions">
        <button type="button" className="admin-confirm-actions__cancel" onClick={onCancel}>
          ביטול
        </button>
        <button
          type="button"
          className="admin-confirm-actions__delete"
          disabled={saving}
          onClick={() => {
            void (async () => {
              setError(null)
              setSaving(true)
              try {
                await onConfirm()
              } catch {
                setError('לא הצלחנו למחוק. נסו שוב.')
                setSaving(false)
              }
            })()
          }}
        >
          מחיקה
        </button>
      </div>
    </Overlay>
  )
}

function roleLabel(role: AdminUser['role']): string {
  return role === 'ADMIN' ? 'מנהל' : 'עובד'
}

export function AssignEmployeesDialog({
  row,
  onClose,
  onAssign,
}: {
  row: AssignmentRow
  onClose: () => void
  onAssign: (userIds: string[]) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: listUsers })
    const assignedIds = row.workerIds
    const people = useMemo(() => {
      const needle = query.trim().toLowerCase()
      return (usersQuery.data ?? []).filter((person) => {
        if (!person.isActive || assignedIds.includes(person.id)) return false
        if (!needle) return true
        return person.displayName.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle)
      })
    }, [assignedIds, query, usersQuery.data])
  const ready = selected.length > 0

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <Overlay labelledBy="admin-assign-title" onClose={onClose} wide>
      <div className="admin-modal__top">
        <div className="admin-modal__heading">
          <span className="admin-modal__icon">
            <PlusPersonIcon />
          </span>
          <div>
            <h2 id="admin-assign-title">שיוך עובד חדש למשימה</h2>
            <p className="admin-modal__hint">כאן תוכל לשייך עובד חדש מהמאגר לטובת</p>
            <div className="admin-modal__path">
              <span className="admin-modal__tag admin-modal__tag--client">{row.client}</span>
              <span>→</span>
              <span className="admin-modal__tag admin-modal__tag--project">{row.project}</span>
              <span>→</span>
              <span className="admin-modal__tag admin-modal__tag--task">{row.task}</span>
            </div>
          </div>
        </div>
        <CloseX onClick={onClose} />
      </div>

      {error ? <p className="admin-modal__error">{error}</p> : null}

      <label className="admin-field">
        <span>בחר עובד מהרשימה</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם עובד"
        />
      </label>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th> </th>
              <th>אימייל</th>
              <th>שם מלא</th>
              <th>תפקיד</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={4}>
                  <p className="admin-empty">טוען…</p>
                </td>
              </tr>
            ) : people.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <p className="admin-empty">אין מידע קיים עד כה</p>
                </td>
              </tr>
            ) : (
              people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(person.id)}
                      onChange={() => toggle(person.id)}
                      aria-label={`בחירה ${person.displayName}`}
                    />
                  </td>
                  <td>{person.email}</td>
                  <td>{person.displayName}</td>
                  <td>{roleLabel(person.role)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className={ready ? 'admin-modal__submit admin-modal__submit--ready' : 'admin-modal__submit'}
        disabled={!ready || saving}
        onClick={() => {
          void (async () => {
            setError(null)
            setSaving(true)
            try {
              await onAssign(selected)
              onClose()
            } catch {
              setError('לא הצלחנו לשייך. נסו שוב.')
              setSaving(false)
            }
          })()
        }}
      >
        שייך עובד למשימה
      </button>
    </Overlay>
  )
}
