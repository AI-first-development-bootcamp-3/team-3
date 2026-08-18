import { request } from './apiClient'

export interface AssignmentWorker {
  userId: string
  displayName: string
}

export interface AdminAssignmentRow {
  taskId: string
  taskName: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  workers: AssignmentWorker[]
}

export async function listAssignments(): Promise<AdminAssignmentRow[]> {
  const { assignments } = await request<{ assignments: AdminAssignmentRow[] }>('/admin/assignments')
  return assignments
}

export async function createAssignments(taskId: string, userIds: string[]): Promise<AdminAssignmentRow> {
  const { assignment } = await request<{ assignment: AdminAssignmentRow }>('/admin/assignments', {
    method: 'POST',
    body: { taskId, userIds },
  })
  return assignment
}

export async function deleteAssignment(taskId: string, userId: string): Promise<void> {
  await request<undefined>(`/admin/assignments?taskId=${encodeURIComponent(taskId)}&userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}
