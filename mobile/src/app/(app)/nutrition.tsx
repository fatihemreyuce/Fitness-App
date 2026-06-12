import { useCallback, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Text, Card, ProgressBar, StatChip } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useDayEntries, useGoals, entryMacros, type MealType } from '../../lib/queries'
import { todayISO } from '../../lib/stats'

const MEALS: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Kahvaltı', icon: 'cafe' },
  { type: 'lunch', label: 'Öğle', icon: 'sunny' },
  { type: 'dinner', label: 'Akşam', icon: 'moon' },
  { type: 'snack', label: 'Ara', icon: 'fast-food' },
]

export default function Nutrition() {
  const [date, setDate] = useState(todayISO())
  // Ekran her odaklandığında bugünün tarihini tazele (gece yarısını geçince
  // "Bugün" eski günde donmasın).
  useFocusEffect(useCallback(() => setDate(todayISO()), []))
  const { data: entries, isLoading } = useDayEntries(date)
  const { data: goals } = useGoals()
  const router = useRouter()

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carb: 0, fat: 0 }
    for (const e of entries ?? []) {
      const m = entryMacros(e)
      t.calories += m.calories; t.protein += m.protein; t.carb += m.carb; t.fat += m.fat
    }
    return t
  }, [entries])

  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const remaining = Math.round(calGoal - totals.calories)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen scroll>
      <Text variant="label">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Bugün</Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <View>
          <Text variant="stat">{Math.round(totals.calories).toLocaleString('tr-TR')}</Text>
          <Text variant="label">/ {calGoal.toLocaleString('tr-TR')} kcal · kalan {remaining}</Text>
        </View>
        <View style={{ marginVertical: spacing.md }}>
          <ProgressBar value={totals.calories / calGoal} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip label="PROTEİN" value={`${Math.round(totals.protein)}g`} color={colors.protein} />
          <StatChip label="KARB" value={`${Math.round(totals.carb)}g`} color={colors.carb} />
          <StatChip label="YAĞ" value={`${Math.round(totals.fat)}g`} color={colors.fat} />
        </View>
      </Card>

      {MEALS.map((meal) => {
        const items = (entries ?? []).filter((e) => e.meal_type === meal.type)
        const cal = items.reduce((s, e) => s + entryMacros(e).calories, 0)
        return (
          <View key={meal.type} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name={meal.icon} size={18} color={colors.accent} />
                <Text variant="subtitle">{meal.label}</Text>
              </View>
              <Pressable onPress={() => router.push(`/(app)/add-food?meal=${meal.type}&date=${date}`)}>
                <Text variant="label" color={colors.accent}>+ Ekle  ({Math.round(cal)} kcal)</Text>
              </Pressable>
            </View>
            {items.length === 0 ? (
              <Card style={{ borderStyle: 'dashed' }}>
                <Text variant="label">Henüz besin eklenmedi</Text>
              </Card>
            ) : (
              <Card style={{ padding: spacing.md }}>
                {items.map((e) => (
                  <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text variant="body">{e.food.name} · {e.quantity_g}g</Text>
                    <Text variant="body" color={colors.textMuted}>{Math.round(entryMacros(e).calories)} kcal</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )
      })}
    </Screen>
  )
}
