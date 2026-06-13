import { useTranslation } from 'react-i18next'
import { ALL_UNITS, WARDS } from '@/constants/regions'

export function useUnits() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ko'

  const getUnitName = (unitId: string) =>
    ALL_UNITS.find(u => u.id === unitId)?.name[lang] ?? unitId

  const getWardName = (wardNameKo: string) =>
    lang === 'ko' ? wardNameKo : (WARDS.find(w => w.name.ko === wardNameKo)?.name.en ?? wardNameKo)

  return { getUnitName, getWardName }
}
