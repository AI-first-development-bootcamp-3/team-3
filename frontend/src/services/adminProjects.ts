import { request } from './apiClient'

export type ReportFormat = 'CLOCK_IN_OUT' | 'SUM_HOURS'

export interface AdminProject {
  id: string
  name: string
  isActive: boolean
  reportFormat: ReportFormat
  clientId: string
  clientName: string
}

export interface CreateProjectRequest {
  name: string
  clientId: string
}

export interface UpdateProjectRequest {
  name?: string
  isActive?: boolean
  reportFormat?: ReportFormat
}

export async function listProjects(): Promise<AdminProject[]> {
  const { projects } = await request<{ projects: AdminProject[] }>('/admin/projects')
  return projects
}

export async function createProject(input: CreateProjectRequest): Promise<AdminProject> {
  const { project } = await request<{ project: AdminProject }>('/admin/projects', { method: 'POST', body: input })
  return project
}

export async function updateProject(id: string, input: UpdateProjectRequest): Promise<AdminProject> {
  const { project } = await request<{ project: AdminProject }>(`/admin/projects/${id}`, { method: 'PATCH', body: input })
  return project
}
