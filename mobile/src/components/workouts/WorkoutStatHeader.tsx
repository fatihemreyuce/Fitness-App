import { View } from 'react-native'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function WorkoutStatHeader({ title, subtitle, stats }: {
  title: string
  subtitle?: string
  stats: { value: string; label: string }[]
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md }}>
      <View style={{ height: 3, backgroundColor: colors.accent }} />
      <View style={{ padding: spacing.lg }}>
        <Text variant="subtitle" style={{ textTransform: 'capitalize' }}>{title}</Text>
        {subtitle ? <Text variant="label" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
          {stats.map((s, i) => (
            <View key={i}>
              <Text variant="stat" color={colors.accent} style={{ fontSize: 18 }}>{s.value}</Text>
              <Text variant="label" style={{ fontSize: 10, textTransform: 'uppercase' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
