import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function ExerciseSetGroup({ exerciseName, sets, onDeleteSet }: {
  exerciseName: string
  sets: { reps: number; weight_kg: number }[]
  onDeleteSet?: (indexInGroup: number) => void
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.sm }}>
        <Ionicons name="barbell" size={16} color={colors.accent} />
        <Text variant="body" style={{ fontWeight: '700' }}>{exerciseName}</Text>
        <Text variant="label" style={{ marginLeft: 'auto' }}>{sets.length} set</Text>
      </View>
      {sets.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
          <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="label" style={{ fontSize: 10 }}>{i + 1}</Text>
          </View>
          <Text variant="body" style={{ flex: 1 }}>{s.reps} <Text variant="label">tekrar ×</Text> {s.weight_kg} kg</Text>
          {onDeleteSet ? (
            <Pressable onPress={() => onDeleteSet(i)} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  )
}
