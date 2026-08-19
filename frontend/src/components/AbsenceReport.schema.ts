import { z } from 'zod'
import type { Absence, AbsenceType } from '../types'

/** Types an employee may pick in the absence form. HOLIDAY is system-owned. */
export const ABSENCE_TYPES = ['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'] as const

export type EmployeeAbsenceType = (typeof ABSENCE_TYPES)[number]

export const ABSENCE_FORM_KINDS = ['VACATION_HALF', 'VACATION_FULL', 'SICK', 'RESERVE_DUTY', 'OTHER'] as const

export type AbsenceFormKind = (typeof ABSENCE_FORM_KINDS)[number]

export function employeeAbsenceType(type: AbsenceType | undefined): EmployeeAbsenceType | '' {
  if (type && (ABSENCE_TYPES as readonly string[]).includes(type)) return type as EmployeeAbsenceType
  return ''
}

export function absenceFormKindFromAbsence(absence?: Pick<Absence, 'type' | 'halfDay'>): AbsenceFormKind | '' {
  const type = employeeAbsenceType(absence?.type)
  if (!type) return ''
  if (type === 'VACATION') return absence?.halfDay ? 'VACATION_HALF' : 'VACATION_FULL'
  return type
}

export function absencePayloadFromKind(kind: AbsenceFormKind): { type: EmployeeAbsenceType; halfDay: boolean } {
  if (kind === 'VACATION_HALF') return { type: 'VACATION', halfDay: true }
  if (kind === 'VACATION_FULL') return { type: 'VACATION', halfDay: false }
  return { type: kind, halfDay: false }
}

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  VACATION: 'חופשה 🏖️',
  SICK: 'מחלה 😷',
  RESERVE_DUTY: 'מילואים 🚨',
  OTHER: 'אחר',
  HOLIDAY: 'חג 🎉',
}

export const ABSENCE_FORM_KIND_LABELS: Record<AbsenceFormKind, string> = {
  VACATION_HALF: 'חופשה - חצי יום 🏖️',
  VACATION_FULL: 'חופשה - יום מלא 🏖️',
  SICK: ABSENCE_TYPE_LABELS.SICK,
  RESERVE_DUTY: ABSENCE_TYPE_LABELS.RESERVE_DUTY,
  OTHER: ABSENCE_TYPE_LABELS.OTHER,
}

export const HALF_DAY_VACATION_LABEL = 'חצי יום חופשה 🏖️'

const isoDate = z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD')

export const absenceReportSchema = z
  .object({
    kind: z
      .union([z.literal(''), z.enum(ABSENCE_FORM_KINDS)])
      .refine((value) => value !== '', { message: 'יש לבחור סוג היעדרות' }),
    startDate: isoDate,
    endDate: z.string(),
    documents: z.array(z.instanceof(File)).optional().default([]),
  })
  .superRefine((values, ctx) => {
    if (values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'תאריך הסיום לא יכול להיות לפני ההתחלה' })
    }
    if (values.kind !== 'VACATION_HALF') return
    if (values.endDate && values.endDate !== values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['kind'], message: 'חצי יום הוא ליום אחד בלבד' })
    }
  })

/**
 * The two halves of this schema differ and the form needs both: the select
 * starts on the empty placeholder option, which only the input side admits,
 * while a submitted form has been through the refine and so carries a real
 * absence kind.
 */
export type AbsenceReportInput = z.input<typeof absenceReportSchema>
export type AbsenceReportValues = z.output<typeof absenceReportSchema>
