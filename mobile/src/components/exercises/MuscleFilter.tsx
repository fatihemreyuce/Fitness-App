// mobile/src/components/exercises/MuscleFilter.tsx
import { ScrollView, Pressable } from 'react-native'
import { Text } from '../ui'
import { colors, spacing, radius } from '../../theme'

export function MuscleFilter({
  groups,
  selected,
  onSelect,
}: {
  groups: string[] // 'Tümü' başta dahil
  selected: string
  onSelect: (g: string) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {groups.map((g) => {
        const on = g === selected
        return (
          <Pressable
            key={g}
            onPress={() => onSelect(g)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.xl,
              backgroundColor: on ? colors.accent : colors.cardAlt,
              borderWidth: 1,
              borderColor: on ? colors.accent : 'transparent',
            }}
          >
            <Text variant="label" color={on ? colors.accentText : colors.textMuted} style={{ fontWeight: '700' }}>
              {g}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
