import { useQuery } from '@tanstack/react-query'
import { request } from '../services/apiClient'

// Module-level, not component state - proves dedup across independent
// component instances, not just re-renders of one. See SCRUM-39's design.md.
export let healthCheckFetchCount = 0

function fetchHealth() {
  healthCheckFetchCount += 1
  return request('/health')
}

/**
 * Sample query (SCRUM-39): a placeholder /health endpoint - no backend is
 * running during frontend dev/verification, so this is expected to error.
 * What's being proven is the dedup count, not a successful response.
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  })
}
