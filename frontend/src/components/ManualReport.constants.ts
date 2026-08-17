import type { WorkLocation } from '../types'

export type PickerStep = 'project' | 'task' | 'location'

/** Copy and order follow the Figma בחר מיקום sheet, not the enum order. */
export const LOCATION_OPTIONS: { value: WorkLocation; label: string }[] = [
  { value: 'OFFICE', label: 'משרד' },
  { value: 'HOME', label: 'בית' },
  { value: 'CLIENT', label: 'בית לקוח' },
]
