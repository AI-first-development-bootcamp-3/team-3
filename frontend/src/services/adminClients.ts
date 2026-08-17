import { request } from './apiClient'

export interface AdminClient {
  id: string
  name: string
  contactDetails: string | null
  isActive: boolean
}

export interface CreateClientRequest {
  name: string
  contactDetails?: string
}

export interface UpdateClientRequest {
  name?: string
  contactDetails?: string
  isActive?: boolean
}

export async function listClients(): Promise<AdminClient[]> {
  const { clients } = await request<{ clients: AdminClient[] }>('/admin/clients')
  return clients
}

export async function createClient(input: CreateClientRequest): Promise<AdminClient> {
  const { client } = await request<{ client: AdminClient }>('/admin/clients', { method: 'POST', body: input })
  return client
}

export async function updateClient(id: string, input: UpdateClientRequest): Promise<AdminClient> {
  const { client } = await request<{ client: AdminClient }>(`/admin/clients/${id}`, { method: 'PATCH', body: input })
  return client
}
