// mobile/src/components/nutrition/MealSection.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card } from '../ui'
import { colors, spacing } from '../../theme'

export type MealItem = { id: string; name: string; quantity_g: number; calories: number }

export function MealSection({
  label,
  icon,
  items,
  totalCal,
  onAdd,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: MealItem[]
  totalCal: number
  onAdd: () => void
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={icon} size={18} color={colors.accent} />
          <Text variant="subtitle">{label}</Text>
          <Text variant="label" color={colors.textFaint}>{Math.round(totalCal)} kcal</Text>
        </View>
        <Pressable onPress={onAdd} hitSlop={6}>
          <Text variant="label" color={colors.accent}>+ Ekle</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Pressable onPress={onAdd}>
          <Card style={{ borderStyle: 'dashed', paddingVertical: spacing.md }}>
            <Text variant="label" color={colors.textFaint}>Henüz besin eklenmedi · dokun ve ekle</Text>
          </Card>
        </Pressable>
      ) : (
        <Card style={{ padding: spacing.md }}>
          {items.map((it, idx) => (
            <View
              key={it.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 5,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text variant="body">{it.name} · {it.quantity_g}g</Text>
              <Text variant="body" color={colors.textMuted}>{Math.round(it.calories)} kcal</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}
