import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAssignments, createAssignments } from '../../services/adminAssignments'
import { listClients, updateClient } from '../../services/adminClients'
import { listProjects, updateProject } from '../../services/adminProjects'
import { updateTask } from '../../services/adminTasks'
import {
  AssignEmployeesDialog,
  CreateEntityDialog,
  DeleteEntityDialog,
  EditEntityDialog,
  type AssignmentRow,
  type CreateKind,
  type DeleteKind,
  type EditKind,
} from './AdminFigmaDialogs'
import AdminFloatingMenu from '../../components/AdminFloatingMenu'
import AdminPillOverflow from '../../components/AdminPillOverflow'
import './AdminAssignments.css'

const PAGE_SIZE = 10
const VISIBLE_PILLS = 3

const CREATE_ITEMS = ['צור לקוח חדש', 'צור פרויקט חדש', 'צור משימה חדשה'] as const
const EDIT_ITEMS = ['ערוך לקוח', 'ערוך פרויקט', 'ערוך משימה', 'ערוך שיוך עובדים'] as const
const DELETE_ITEMS = ['מחק לקוח', 'מחק פרויקט', 'מחק משימה'] as const

const CREATE_KIND: Record<(typeof CREATE_ITEMS)[number], CreateKind> = {
  'צור לקוח חדש': 'client',
  'צור פרויקט חדש': 'project',
  'צור משימה חדשה': 'task',
}

const EDIT_KIND: Record<(typeof EDIT_ITEMS)[number], EditKind | 'assign'> = {
  'ערוך לקוח': 'client',
  'ערוך פרויקט': 'project',
  'ערוך משימה': 'task',
  'ערוך שיוך עובדים': 'assign',
}

const DELETE_KIND: Record<(typeof DELETE_ITEMS)[number], DeleteKind> = {
  'מחק לקוח': 'client',
  'מחק פרויקט': 'project',
  'מחק משימה': 'task',
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M12.4 3.1a1.3 1.3 0 0 1 1.8 1.8L6.6 12.5 3.5 13.2l.7-3.1 8.2-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 5.5h10M7 5.5V4h4v1.5M6.2 5.5l.5 8.2h4.6l.5-8.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function WorkerPills({ workers }: { workers: string[] }) {
  const visible = workers.slice(0, VISIBLE_PILLS)
  const extra = workers.length - visible.length
  return (
    <div className="admin-pills">
      {visible.map((name, index) => (
        <span key={`${name}-${index}`} className="admin-pill">
          {name}
        </span>
      ))}
      {extra > 0 ? (
        <AdminPillOverflow count={extra} label={`כל העובדים: ${workers.join(', ')}`}>
          {workers.map((name, index) => (
            <span key={`${name}-all-${index}`} className="admin-pill">
              {name}
            </span>
          ))}
        </AdminPillOverflow>
      ) : null}
    </div>
  )
}

function toRows(assignments: Awaited<ReturnType<typeof listAssignments>>): AssignmentRow[] {
  return assignments.map((row) => ({
    key: row.taskId,
    taskId: row.taskId,
    clientId: row.clientId,
    projectId: row.projectId,
    client: row.clientName,
    project: row.projectName,
    task: row.taskName,
    workers: row.workers.map((worker) => worker.displayName),
    workerIds: row.workers.map((worker) => worker.userId),
  }))
}

function AdminAssignments() {
  const queryClient = useQueryClient()
  const assignmentsQuery = useQuery({ queryKey: ['adminAssignments'], queryFn: listAssignments })
  const clientsQuery = useQuery({ queryKey: ['adminClients'], queryFn: listClients })
  const projectsQuery = useQuery({ queryKey: ['adminProjects'], queryFn: listProjects })

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [createAnchor, setCreateAnchor] = useState<HTMLElement | null>(null)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [rowMenu, setRowMenu] = useState<{ key: string; kind: 'edit' | 'delete'; anchor: HTMLElement } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ row: AssignmentRow; kind: DeleteKind } | null>(null)
  const [editTarget, setEditTarget] = useState<{ row: AssignmentRow; kind: EditKind } | null>(null)
  const [assignRow, setAssignRow] = useState<AssignmentRow | null>(null)

  const rowsState = useMemo(() => toRows(assignmentsQuery.data ?? []), [assignmentsQuery.data])
  const activeClients = (clientsQuery.data ?? []).filter((client) => client.isActive).map((client) => ({
    id: client.id,
    name: client.name,
  }))
  const activeProjects = (projectsQuery.data ?? [])
    .filter((project) => project.isActive)
    .map((project) => ({ id: project.id, name: project.name, clientId: project.clientId }))

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rowsState
    return rowsState.filter((row) => row.workers.some((name) => name.toLowerCase().includes(needle)))
  }, [query, rowsState])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['adminAssignments'] }),
      queryClient.invalidateQueries({ queryKey: ['adminClients'] }),
      queryClient.invalidateQueries({ queryKey: ['adminProjects'] }),
    ])
  }

  const tableMessage = assignmentsQuery.isError
    ? 'לא הצלחנו לטעון. נסו שוב.'
    : assignmentsQuery.isLoading
      ? 'טוען…'
      : 'אין מידע קיים עד כה'

  return (
    <section className="admin-page--fill">
      <div className="admin-page__head">
        <div className="admin-page__titles">
          <h1 className="admin-page__title">שיוך עובד למשימה</h1>
          <p className="admin-page__lead">כאן תוכל לשייך עובדים למשימות מתוך פרויקטים שונים של לקוחות</p>
        </div>
        <div className="admin-page__tools">
          <label className="admin-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="חיפוש לפי שם עובד"
            />
          </label>
          <div className="admin-create">
            <button
              type="button"
              className="admin-create__btn"
              aria-expanded={Boolean(createAnchor)}
              onClick={(event) => {
                const button = event.currentTarget
                setCreateAnchor((current) => (current ? null : button))
              }}
            >
              יצירה
              <ChevronIcon />
            </button>
            {createAnchor ? (
              <AdminFloatingMenu anchor={createAnchor} onClose={() => setCreateAnchor(null)}>
                {CREATE_ITEMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCreateAnchor(null)
                      setCreateKind(CREATE_KIND[item])
                    }}
                  >
                    {item}
                  </button>
                ))}
              </AdminFloatingMenu>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>שם פרויקט</th>
              <th>שם המשימה</th>
              <th>שמות העובדים המשוייכים</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <p className="admin-empty">{tableMessage}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.client}</td>
                  <td>{row.project}</td>
                  <td>{row.task}</td>
                  <td>
                    <WorkerPills workers={row.workers} />
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--delete"
                        aria-label={`מחיקה ${row.client} ${row.project} ${row.task}`}
                        onClick={(event) => {
                          const button = event.currentTarget
                          setRowMenu((current) =>
                            current?.key === row.key && current.kind === 'delete'
                              ? null
                              : { key: row.key, kind: 'delete', anchor: button },
                          )
                        }}
                      >
                        <TrashIcon />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--edit"
                        aria-label={`עריכה ${row.client} ${row.project} ${row.task}`}
                        onClick={(event) => {
                          const button = event.currentTarget
                          setRowMenu((current) =>
                            current?.key === row.key && current.kind === 'edit'
                              ? null
                              : { key: row.key, kind: 'edit', anchor: button },
                          )
                        }}
                      >
                        <PencilIcon />
                      </button>
                      {rowMenu?.key === row.key ? (
                        <AdminFloatingMenu
                          anchor={rowMenu.anchor}
                          onClose={() => setRowMenu(null)}
                        >
                          {(rowMenu.kind === 'edit' ? EDIT_ITEMS : DELETE_ITEMS).map((item) => (
                            <button
                              key={item}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setRowMenu(null)
                                if (rowMenu.kind === 'delete') {
                                  setDeleteTarget({ row, kind: DELETE_KIND[item as (typeof DELETE_ITEMS)[number]] })
                                  return
                                }
                                const editKind = EDIT_KIND[item as (typeof EDIT_ITEMS)[number]]
                                if (editKind === 'assign') setAssignRow(row)
                                else setEditTarget({ row, kind: editKind })
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </AdminFloatingMenu>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="admin-pager">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)} aria-label="עמוד ראשון">
            «
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            aria-label="עמוד קודם"
          >
            ‹
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              aria-current={number === currentPage ? 'page' : undefined}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            aria-label="עמוד הבא"
          >
            ›
          </button>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(pageCount)}
            aria-label="עמוד אחרון"
          >
            »
          </button>
        </div>
      </div>

      {createKind ? (
        <CreateEntityDialog
          kind={createKind}
          clients={activeClients}
          projects={activeProjects}
          onClose={() => setCreateKind(null)}
          onCreated={() => {
            void refreshCatalog()
          }}
        />
      ) : null}

      {editTarget ? (
        <EditEntityDialog
          kind={editTarget.kind}
          initialName={
            editTarget.kind === 'client'
              ? editTarget.row.client
              : editTarget.kind === 'project'
                ? editTarget.row.project
                : editTarget.row.task
          }
          onClose={() => setEditTarget(null)}
          onSave={async (name) => {
            if (editTarget.kind === 'client') await updateClient(editTarget.row.clientId, { name })
            else if (editTarget.kind === 'project') await updateProject(editTarget.row.projectId, { name })
            else await updateTask(editTarget.row.taskId, { name })
            await refreshCatalog()
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteEntityDialog
          kind={deleteTarget.kind}
          row={deleteTarget.row}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget.kind === 'client') await updateClient(deleteTarget.row.clientId, { isActive: false })
            else if (deleteTarget.kind === 'project') await updateProject(deleteTarget.row.projectId, { isActive: false })
            else await updateTask(deleteTarget.row.taskId, { status: 'CLOSED' })
            setDeleteTarget(null)
            await refreshCatalog()
          }}
        />
      ) : null}

      {assignRow ? (
        <AssignEmployeesDialog
          row={assignRow}
          onClose={() => setAssignRow(null)}
          onAssign={async (userIds) => {
            await createAssignments(assignRow.taskId, userIds)
            await refreshCatalog()
          }}
        />
      ) : null}
    </section>
  )
}

export default AdminAssignments
