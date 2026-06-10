import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MonthEntry } from '@/utils/visitStats'

interface Props {
  data: MonthEntry[]
}

export function MonthlyTrendChart({ data }: Props) {
  const { t } = useTranslation()
  const hasData = data.some(d => d.count > 0)

  if (!hasData) {
    return <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{t('stats.noData')}</p>
  }

  // 'YYYY-MM' -> 'M월' 라벨
  const display = data.map(d => ({ ...d, label: `${Number(d.month.slice(5, 7))}월` }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={display} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#177C9C" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
