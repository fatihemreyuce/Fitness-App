import { View } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { useWorkoutStats } from '../../lib/queries'
import { summary } from '../../lib/stats'

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.accent }}>{value}</Text>
      <Text variant="eyebrow" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  )
}

export function KpiStrip() {
  const { data } = useWorkoutStats()
  const s = summary(data ?? [])
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Kpi value={String(s.total)} label="Toplam" />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <Kpi value={String(s.thisWeek)} label="Bu hafta" />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <Kpi value={`${(s.totalVolumeKg / 1000).toFixed(1)}t`} label="Hacim" />
    </View>
  )
}
