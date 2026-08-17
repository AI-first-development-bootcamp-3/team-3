import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import AdminEntityForm, { AdminActiveToggle } from './AdminEntityForm'

describe('AdminEntityForm / AdminActiveToggle', () => {
  afterEach(() => {
    cleanup()
  })

  it('reactivating an inactive entity applies immediately, no confirmation', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<AdminEntityForm onSubmit={() => {}}><AdminActiveToggle active={false} onChange={onChange} /></AdminEntityForm>)

    await user.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.queryByText(/השבתת הרשומה/)).not.toBeInTheDocument()
  })

  it('deactivating shows a confirmation and does not change state until confirmed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<AdminEntityForm onSubmit={() => {}}><AdminActiveToggle active={true} onChange={onChange} /></AdminEntityForm>)

    await user.click(screen.getByRole('switch'))

    expect(await screen.findByText(/השבתת הרשומה/)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'השבת' }))

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('cancelling the confirmation leaves the entity active', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<AdminEntityForm onSubmit={() => {}}><AdminActiveToggle active={true} onChange={onChange} /></AdminEntityForm>)

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'ביטול' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('switch')).toBeChecked()
  })
})
