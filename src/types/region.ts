export type UnitType = 'stake' | 'district'

export interface Region {
  id: string
  name: string
  seventyUid?: string
}

export interface Unit {
  id: string
  name: { ko: string; en: string }
  type: UnitType
  regionId: string
  presidentUid?: string
}
