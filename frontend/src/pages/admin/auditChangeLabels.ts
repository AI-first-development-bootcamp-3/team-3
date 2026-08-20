export type AuditSnapshotRow = {
  clientId?: string
  projectId?: string
  taskId?: string
  workLocation?: string
  hours?: number | string
  description?: string | null
  startTime?: string
  endTime?: string
  rowStartTime?: string | null
  rowEndTime?: string | null
}

export type AuditSnapshot = {
  action: 'REPLACED' | 'DELETED'
  previousJson: unknown
  nextJson: unknown
}

export const AUDIT_CHANGE_LABELS = {
  created: 'יצירת דיווח',
  deleted: 'מחיקת דיווח',
  addProject: 'הוספת פרויקט',
  removeProject: 'הסרת פרויקט',
  project: 'שינוי פרויקט',
  client: 'שינוי לקוח',
  task: 'שינוי משימה',
  location: 'שינוי מיקום',
  hours: 'שינוי שעות',
  description: 'שינוי פירוט',
  fallback: 'עדכון',
} as const

const LABEL_ORDER = [
  AUDIT_CHANGE_LABELS.created,
  AUDIT_CHANGE_LABELS.deleted,
  AUDIT_CHANGE_LABELS.addProject,
  AUDIT_CHANGE_LABELS.removeProject,
  AUDIT_CHANGE_LABELS.project,
  AUDIT_CHANGE_LABELS.client,
  AUDIT_CHANGE_LABELS.task,
  AUDIT_CHANGE_LABELS.location,
  AUDIT_CHANGE_LABELS.hours,
  AUDIT_CHANGE_LABELS.description,
  AUDIT_CHANGE_LABELS.fallback,
] as const

function asRows(value: unknown): AuditSnapshotRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is AuditSnapshotRow => Boolean(row) && typeof row === 'object')
}

function same(left: unknown, right: unknown): boolean {
  return String(left ?? '') === String(right ?? '')
}

function hoursOf(row: AuditSnapshotRow): number {
  return Number(row.hours ?? 0)
}

function pairRows(previous: AuditSnapshotRow[], next: AuditSnapshotRow[]) {
  const available = next.map((_, index) => index)
  const pairs: [AuditSnapshotRow, AuditSnapshotRow][] = []
  const unmatchedPrevious: AuditSnapshotRow[] = []

  const take = (match: (row: AuditSnapshotRow) => boolean): number => {
    const position = available.findIndex((index) => match(next[index]!))
    if (position === -1) return -1
    return available.splice(position, 1)[0] ?? -1
  }

  for (const prev of previous) {
    let index = take((row) => same(row.projectId, prev.projectId) && same(row.taskId, prev.taskId))
    if (index === -1) index = take((row) => same(row.projectId, prev.projectId))
    if (index === -1) {
      unmatchedPrevious.push(prev)
      continue
    }
    pairs.push([prev, next[index]!])
  }

  const leftoverNext = available.map((index) => next[index]!)
  const removed: AuditSnapshotRow[] = []
  for (const prev of unmatchedPrevious) {
    const swapped = leftoverNext.shift()
    if (swapped) pairs.push([prev, swapped])
    else removed.push(prev)
  }

  return { pairs, added: leftoverNext, removed }
}

function collectPairChanges(previous: AuditSnapshotRow, next: AuditSnapshotRow, labels: Set<string>) {
  if (!same(previous.projectId, next.projectId)) labels.add(AUDIT_CHANGE_LABELS.project)
  else if (!same(previous.clientId, next.clientId)) labels.add(AUDIT_CHANGE_LABELS.client)
  if (!same(previous.taskId, next.taskId)) labels.add(AUDIT_CHANGE_LABELS.task)
  if (!same(previous.workLocation, next.workLocation)) labels.add(AUDIT_CHANGE_LABELS.location)
  if (
    hoursOf(previous) !== hoursOf(next) ||
    !same(previous.startTime, next.startTime) ||
    !same(previous.endTime, next.endTime) ||
    !same(previous.rowStartTime, next.rowStartTime) ||
    !same(previous.rowEndTime, next.rowEndTime)
  ) {
    labels.add(AUDIT_CHANGE_LABELS.hours)
  }
  if (!same(previous.description ?? '', next.description ?? '')) labels.add(AUDIT_CHANGE_LABELS.description)
}

export function auditChangeLabels(audit: AuditSnapshot): string[] {
  if (audit.action === 'DELETED') return [AUDIT_CHANGE_LABELS.deleted]

  const previous = asRows(audit.previousJson)
  const next = asRows(audit.nextJson)
  if (previous.length === 0 && next.length > 0) return [AUDIT_CHANGE_LABELS.created]

  const labels = new Set<string>()
  const { pairs, added, removed } = pairRows(previous, next)
  if (added.length > 0) labels.add(AUDIT_CHANGE_LABELS.addProject)
  if (removed.length > 0) labels.add(AUDIT_CHANGE_LABELS.removeProject)
  for (const [prev, nxt] of pairs) collectPairChanges(prev, nxt, labels)

  if (labels.size === 0) return [AUDIT_CHANGE_LABELS.fallback]
  return LABEL_ORDER.filter((label) => labels.has(label))
}
