import { View, Pressable } from 'react-native'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

function StatMini({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text variant="body" color={colors.text} style={{ fontWeight: '800' }}>{value}</Text>
      <Text variant="label" style={{ fontSize: 10 }}>{label}</Text>
    </View>
  )
}

export function WorkoutCard({ date, exercises, setCount, volumeKg, onPress }: {
  date: Date
  exercises: string[]
  setCount: number
  volumeKg: number
  onPress: () => void
}) {
  const shown = exercises.slice(0, 3)
  const extra = exercises.length - shown.length
  const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return (
    <Pressable onPress={onPress} style={{ marginBottom: spacing.sm }}>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }}>
        <View style={{ height: 3, backgroundColor: colors.accent }} />
        <View style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" style={{ fontWeight: '700', textTransform: 'capitalize' }}>{dateStr}</Text>
            <Text variant="label">{timeStr}</Text>
          </View>
          {exercises.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: spacing.sm }}>
              {shown.map((name, i) => (
                <View key={i} style={{ backgroundColor: '#c8ff0015', borderWidth: 1, borderColor: '#c8ff0033', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text variant="label" color={colors.accent} style={{ fontSize: 10 }}>{name}</Text>
                </View>
              ))}
              {extra > 0 ? (
                <View style={{ backgroundColor: colors.cardAlt, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text variant="label" style={{ fontSize: 10 }}>+{extra}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm }}>
            <StatMini value={String(setCount)} label="set" />
            <StatMini value={`${(volumeKg / 1000).toFixed(1)} t`} label="hacim" />
            <StatMini value={String(exercises.length)} label="egzersiz" />
          </View>
        </View>
      </View>
    </Pressable>
  )
}
