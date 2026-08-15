import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { notification } from 'antd'
import { ApiError } from './apiClient'

function onGlobalError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) return // handled in apiClient
  notification.error({
    message: 'Error',
    description:
      error instanceof ApiError && error.status >= 500
        ? 'Server error. Please try again.'
        : 'An unexpected error occurred.',
  })
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onGlobalError }),
  mutationCache: new MutationCache({ onError: onGlobalError }),
})
