// mobile/src/components/nutrition/FoodConfirmCard.tsx
import { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Text, Card, Button, Input, StatChip, Hairline } from '../ui'
import { colors, spacing } from '../../theme'
import { portionToPer100g, type ScanResult } from '../../lib/foodScan'
import type { MealType } from '../../lib/queries'

const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Kahvaltı' },
  { type: 'lunch', label: 'Öğle' },
  { type: 'dinner', label: 'Akşam' },
  { type: 'snack', label: 'Atış.' },
]

export type FoodConfirmArgs = {
  name: string
  per100g: ReturnType<typeof portionToPer100g>
  quantity_g: number
  meal_type: MealType
}

type Props = {
  result: ScanResult & { yemek_adi: string } // null-olmayan
  isSaving: boolean
  onConfirm: (args: FoodConfirmArgs) => void
  onRetry: () => void
}

export function FoodConfirmCard({ result, isSaving, onConfirm, onRetry }: Props) {
  const [portion, setPortion] = useState(String(Math.round(result.porsiyon_gram) || 100))
  const [meal, setMeal] = useState<MealType | null>(null)

  const base = result.porsiyon_gram > 0 ? result.porsiyon_gram : 1
  const factor = (Number(portion) || 0) / base
  const kcal = Math.round(result.kalori * factor)
  const p = Math.round(result.protein * factor)
  const c = Math.round(result.karbonhidrat * factor)
  const f = Math.round(result.yag * factor)

  function confirm() {
    const q = Number(portion)
    if (!q || q <= 0 || !meal) return
    onConfirm({
      name: result.yemek_adi,
      per100g: portionToPer100g(result),
      quantity_g: q,
      meal_type: meal,
    })
  }

  return (
    <View>
      <Card>
        <Text variant="subtitle">{result.yemek_adi}</Text>

        <Hairline />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip label="KCAL" value={`${kcal}`} />
          <StatChip label="PROTEİN" value={`${p}g`} color={colors.protein} />
          <StatChip label="KARB" value={`${c}g`} color={colors.carb} />
          <StatChip label="YAĞ" value={`${f}g`} color={colors.fat} />
        </View>

        <Hairline />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="eyebrow">PORSİYON</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Input
              keyboardType="numeric"
              value={portion}
              onChangeText={setPortion}
              style={{ width: 70, textAlign: 'center', fontSize: 16, fontWeight: '700' }}
            />
            <Text variant="label">g</Text>
          </View>
        </View>

        <Text variant="eyebrow" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          ÖĞÜN
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {MEALS.map((m) => {
            const on = meal === m.type
            return (
              <Pressable
                key={m.type}
                onPress={() => setMeal(m.type)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: on ? colors.accentSoft : colors.cardAlt,
                  borderWidth: 1,
                  borderColor: on ? colors.accent : 'transparent',
                }}
              >
                <Text variant="label" color={on ? colors.accent : colors.textMuted}>
                  {m.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      <Button
        icon="checkmark"
        title={isSaving ? 'Ekleniyor...' : 'Onayla ve Günlüğüme Ekle'}
        onPress={confirm}
        disabled={isSaving || !meal}
        style={{ marginTop: spacing.md }}
      />
      <Pressable onPress={onRetry} style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
        <Text variant="label" color={colors.textMuted}>
          Yeniden Tara
        </Text>
      </Pressable>
    </View>
  )
}
