// mobile/src/components/nutrition/NutritionHero.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { CalorieRing } from '../charts/CalorieRing'

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal?: number; color: string }) {
  const pct = goal && goal > 0 ? Math.max(0, Math.min(1, value / goal)) : null
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text variant="label" color={color}>{label}</Text>
        <Text variant="label" color={colors.textMuted}>{Math.round(value)}g</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 3, backgroundColor: color, width: `${(pct ?? 1) * 100}%`, opacity: pct == null ? 0.4 : 1 }} />
      </View>
    </View>
  )
}

export function NutritionHero({
  dateLabel,
  calories,
  calGoal,
  protein,
  proteinGoal,
  carb,
  fat,
  onScan,
}: {
  dateLabel: string
  calories: number
  calGoal: number
  protein: number
  proteinGoal: number
  carb: number
  fat: number
  onScan: () => void
}) {
  const remaining = Math.round(calGoal - calories)
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="label">{dateLabel}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text variant="title">Bugün</Text>
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.accentSoft,
              borderWidth: 1,
              borderColor: colors.accent,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 999,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="camera" size={15} color={colors.accent} />
          <Text variant="label" color={colors.accent}>AI ile Tara</Text>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <CalorieRing progress={calGoal > 0 ? calories / calGoal : 0}>
          <View style={{ alignItems: 'center' }}>
            <Text variant="stat">{Math.round(calories).toLocaleString('tr-TR')}</Text>
            <Text variant="label">/ {Math.round(calGoal).toLocaleString('tr-TR')} kcal</Text>
            <Text variant="label" color={colors.accent} style={{ fontWeight: '700', marginTop: 2 }}>
              {remaining >= 0
                ? `${remaining.toLocaleString('tr-TR')} kalan`
                : `${Math.abs(remaining).toLocaleString('tr-TR')} aşıldı`}
            </Text>
          </View>
        </CalorieRing>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <MacroBar label="Protein" value={protein} goal={proteinGoal} color={colors.protein} />
        <MacroBar label="Karb" value={carb} color={colors.carb} />
        <MacroBar label="Yağ" value={fat} color={colors.fat} />
      </View>
    </View>
  )
}
