import { ALL_UNITS } from '@/constants/regions'

export function useUnits() {
  const getUnitName = (unitId: string) =>
    ALL_UNITS.find(u => u.id === unitId)?.name ?? unitId
  return { getUnitName }
}
