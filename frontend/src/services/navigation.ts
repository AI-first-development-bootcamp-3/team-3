/** Redirect shim — kept in a separate module so tests can spy without jsdom. */
export function redirectToLogin(): void {
  window.location.href = '/login'
}
