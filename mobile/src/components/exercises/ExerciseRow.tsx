// mobile/src/components/exercises/ExerciseRow.tsx
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'

export function ExerciseRow({
  name,
  subtitle,
  lastWeight,
  isCustom,
  onPress,
}: {
  name: string
  subtitle: string
  lastWeight: number | null
  isCustom: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="body" color={colors.text}>{name}</Text>
          {isCustom ? <Ionicons name="star" size={12} color={colors.accent} /> : null}
        </View>
        <Text variant="label" style={{ marginTop: 2 }}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {lastWeight != null ? (
          <Text variant="body" color={colors.accent} style={{ fontWeight: '700' }}>{lastWeight} kg</Text>
        ) : (
          <Text variant="label" color={colors.textFaint}>—</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  )
}
