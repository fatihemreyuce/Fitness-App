// mobile/src/app/(app)/nutrition.tsx
import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Text } from '../../components/ui'
import { colors } from '../../theme'
import { useDayEntries, useGoals, entryMacros, type MealType } from '../../lib/queries'
import { todayISO } from '../../lib/stats'
import { NutritionHero } from '../../components/nutrition/NutritionHero'
import { MealSection, type MealItem } from '../../components/nutrition/MealSection'
import { NutritionSkeleton } from '../../components/skeletons/NutritionSkeleton'

const MEALS: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Kahvaltı', icon: 'cafe' },
  { type: 'lunch', label: 'Öğle', icon: 'sunny' },
  { type: 'dinner', label: 'Akşam', icon: 'moon' },
  { type: 'snack', label: 'Ara', icon: 'fast-food' },
]

export default function Nutrition() {
  const [date, setDate] = useState(todayISO())
  // Ekran her odaklandığında bugünü tazele (gece yarısı geçince donmasın).
  useFocusEffect(useCallback(() => setDate(todayISO()), []))
  const { data: entries, isLoading } = useDayEntries(date)
  const { data: goals } = useGoals()
  const router = useRouter()

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carb: 0, fat: 0 }
    for (const e of entries ?? []) {
      const m = entryMacros(e)
      t.calories += m.calories
      t.protein += m.protein
      t.carb += m.carb
      t.fat += m.fat
    }
    return t
  }, [entries])

  if (isLoading) return <NutritionSkeleton />

  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const proteinGoal = goals?.daily_protein_goal && goals.daily_protein_goal > 0 ? goals.daily_protein_goal : 150
  const dateLabel = new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Screen scroll>
      <NutritionHero
        dateLabel={dateLabel}
        calories={totals.calories}
        calGoal={calGoal}
        protein={totals.protein}
        proteinGoal={proteinGoal}
        carb={totals.carb}
        fat={totals.fat}
        onScan={() => router.push(`/(app)/scan-food?date=${date}`)}
      />

      {MEALS.map((meal) => {
        const mealEntries = (entries ?? []).filter((e) => e.meal_type === meal.type)
        const items: MealItem[] = mealEntries.map((e) => ({
          id: e.id,
          name: e.food?.name ?? 'Besin',
          quantity_g: e.quantity_g,
          calories: entryMacros(e).calories,
        }))
        const totalCal = items.reduce((s, it) => s + it.calories, 0)
        return (
          <MealSection
            key={meal.type}
            label={meal.label}
            icon={meal.icon}
            items={items}
            totalCal={totalCal}
            onAdd={() => router.push(`/(app)/add-food?meal=${meal.type}&date=${date}`)}
          />
        )
      })}
    </Screen>
  )
}
