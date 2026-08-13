import { useHealthCheck, healthCheckFetchCount } from '../hooks/useHealthCheck'

/**
 * Two independent instances of this render on the sample page (SCRUM-39).
 * Both use the same query key, so TanStack Query should dedupe them into
 * one network call - proven by healthCheckFetchCount staying at 1.
 */
function HealthCheckDemo() {
  const { status } = useHealthCheck()

  return (
    <div>
      status: {status}, fetch count: {healthCheckFetchCount}
    </div>
  )
}

export default HealthCheckDemo
