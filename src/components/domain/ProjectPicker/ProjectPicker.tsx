import { useTranslation } from 'react-i18next'
import { Select } from '@/components/ui'
import { useProjects } from '@/hooks/useProjects'

interface Props {
  value: string
  onChange: (projectId: string) => void
  label?: string
}

export function ProjectPicker({ value, onChange, label }: Props) {
  const { t } = useTranslation()
  const { projects } = useProjects()

  const options = projects
    .filter(p => p.status === 'active' || p.id === value)
    .map(p => ({
      value: p.id,
      label: p.status === 'active' ? p.title : `${p.title} (${t(`project.status.${p.status}`)})`,
    }))

  return (
    <Select
      label={label ?? t('project.pickerLabel')}
      value={value}
      onChange={e => onChange(e.target.value)}
      options={options}
    />
  )
}
