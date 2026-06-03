export type UnitType = 'stake' | 'district'

export interface Region {
  id: string
  name: string
  seventyUid?: string
}

export interface Unit {
  id: string
  name: string
  type: UnitType
  regionId: string
  presidentUid?: string
}
