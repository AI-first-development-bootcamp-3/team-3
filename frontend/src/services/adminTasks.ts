import { request } from './apiClient'

export type TaskStatus = 'OPEN' | 'CLOSED'

export interface AdminTask {
  id: string
  name: string
  status: TaskStatus
  isActive: boolean
  projectId: string
  projectName: string
  clientId: string
  clientName: string
}

export interface CreateTaskRequest {
  name: string
  projectId: string
}

export interface UpdateTaskRequest {
  name?: string
  status?: TaskStatus
  isActive?: boolean
}

export async function listTasks(): Promise<AdminTask[]> {
  const { tasks } = await request<{ tasks: AdminTask[] }>('/admin/tasks')
  return tasks
}

export async function createTask(input: CreateTaskRequest): Promise<AdminTask> {
  const { task } = await request<{ task: AdminTask }>('/admin/tasks', { method: 'POST', body: input })
  return task
}

export async function updateTask(id: string, input: UpdateTaskRequest): Promise<AdminTask> {
  const { task } = await request<{ task: AdminTask }>(`/admin/tasks/${id}`, { method: 'PATCH', body: input })
  return task
}
