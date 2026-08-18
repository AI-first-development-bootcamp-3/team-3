import { describe, expect, it } from 'vitest'
import {
  FORMAT_MISMATCH_MESSAGE,
  HOURS_NOT_ALLOWED_MESSAGE,
  TIMES_REQUIRED_MESSAGE,
  translateReportApiMessage,
} from './reportApiMessages'

describe('translateReportApiMessage', () => {
  it('translates the clock-in/out hours rejection the stop-clock modal used to show in English', () => {
    expect(
      translateReportApiMessage('This project reports clock-in/clock-out, so it cannot carry hours'),
    ).toBe(HOURS_NOT_ALLOWED_MESSAGE)
  })

  it('translates a missing clock pair', () => {
    expect(
      translateReportApiMessage('This project reports clock-in/clock-out, so both row times are required'),
    ).toBe(TIMES_REQUIRED_MESSAGE)
  })

  it('translates a format mismatch wrapper', () => {
    expect(translateReportApiMessage('The report does not match its project reporting format')).toBe(
      FORMAT_MISMATCH_MESSAGE,
    )
  })

  it('leaves an unknown message alone', () => {
    expect(translateReportApiMessage('something else')).toBe('something else')
  })
})
