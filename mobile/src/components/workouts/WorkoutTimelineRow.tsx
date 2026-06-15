// mobile/src/components/workouts/WorkoutTimelineRow.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'

export type TimelineItem = { id: string; date: Date; setCount: number; volumeKg: number }

export function WorkoutTimelineRow({
  item,
  isFirst,
  isLast,
  onPress,
}: {
  item: TimelineItem
  isFirst: boolean
  isLast: boolean
  onPress: (id: string) => void
}) {
  const dateStr = item.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [{ flexDirection: 'row' }, pressed && { opacity: 0.6 }]}
    >
      <View style={{ width: 22, alignItems: 'center' }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginTop: 4,
            backgroundColor: isFirst ? colors.accent : colors.cardAlt,
            borderWidth: isFirst ? 0 : 1,
            borderColor: colors.border,
          }}
        />
        {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 }} /> : null}
      </View>

      <View style={{ flex: 1, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="body" color={colors.text} style={{ fontWeight: '600' }}>{dateStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="label" color={colors.accent} style={{ fontWeight: '700' }}>
              {item.setCount} set · {(item.volumeKg / 1000).toFixed(1)}t
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
          </View>
        </View>
      </View>
    </Pressable>
  )
}
