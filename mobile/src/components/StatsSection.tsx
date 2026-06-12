import { useState, useMemo } from 'react'
import { LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card, EmptyState } from './ui'
import { colors, spacing } from '../theme'
import { BarChart } from './charts/BarChart'
import { Heatmap } from './charts/Heatmap'
import { useWorkoutStats, useNutritionWeek, useGoals } from '../lib/queries'
import { weeklyFrequency, volumeTrend, dailyCalories, heatmap, todayISO } from '../lib/stats'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function StatsSection() {
  const [open, setOpen] = useState(false)

  const today = todayISO()
  const { data: workouts, isLoading: wLoading } = useWorkoutStats()
  const { data: week, isLoading: nLoading } = useNutritionWeek(today)
  const { data: goals } = useGoals()

  // Türetilen ağır hesaplamaları memoize et — her render'da yeniden çalışmasın.
  // (useMemo erken return'den ÖNCE çağrılmalı — hooks kuralı.)
  const derived = useMemo(() => {
    const ws = workouts ?? []
    const freq = weeklyFrequency(ws)
    const vol = volumeTrend(ws)
    const cals = dailyCalories(week ?? [], today)
    const heat = heatmap(ws)
    const heatMax = Math.max(1, ...heat.flatMap((w) => w.days))
    return { ws, freq, vol, cals, heat, heatMax }
  }, [workouts, week, today])

  function toggleOpen() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((o) => !o)
  }

  const header = (
    <Pressable
      onPress={toggleOpen}
      accessibilityRole="button"
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.md },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text variant="eyebrow">Aktivite</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
    </Pressable>
  )

  if (wLoading || nLoading) {
    return (
      <View>
        {header}
        <Card style={{ marginBottom: spacing.lg }}><Text color={colors.textMuted}>İstatistikler yükleniyor...</Text></Card>
      </View>
    )
  }

  const { ws, freq, vol, cals, heat, heatMax } = derived
  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const hasWorkouts = ws.length > 0
  const hasCals = cals.some((c) => c.calories > 0)

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {header}

      {open ? (
        <View>
          {hasWorkouts ? (
            <>
              <Card style={{ marginBottom: spacing.md }}>
                <Text variant="label" style={{ marginBottom: spacing.md }}>Haftalık antrenman sıklığı</Text>
                <BarChart data={freq.map((f) => ({ label: f.label, value: f.count }))} showValues />
              </Card>
              <Card style={{ marginBottom: spacing.md }}>
                <Text variant="label" style={{ marginBottom: spacing.md }}>Kaldırılan hacim trendi (ton, son {vol.length} antrenman)</Text>
                <BarChart data={vol.map((v, i) => ({ label: i === 0 ? 'eski' : i === vol.length - 1 ? 'yeni' : '', value: Number((v.valueKg / 1000).toFixed(2)) }))} />
              </Card>
            </>
          ) : (
            <EmptyState icon="barbell-outline" label="Henüz antrenman yok" hint="Bir antrenman ekleyince burada görünecek" />
          )}

          <Card style={{ marginBottom: spacing.md }}>
            <Text variant="label" style={{ marginBottom: spacing.md }}>Son 7 gün kalori</Text>
            {hasCals ? (
              <BarChart
                data={cals.map((c) => ({ label: c.label, value: Math.round(c.calories) }))}
                color={colors.carb}
                goal={calGoal}
                overColor={colors.fat}
                goalColor={colors.fat}
              />
            ) : (
              <Text variant="label">Son 7 günde besin kaydı yok.</Text>
            )}
          </Card>

          {hasWorkouts ? (
            <Card style={{ marginBottom: spacing.md }}>
              <Text variant="label" style={{ marginBottom: spacing.md }}>Antrenman serisi (son 6 hafta)</Text>
              <Heatmap weeks={heat} max={heatMax} />
            </Card>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
