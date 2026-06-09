import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card } from './ui'
import { colors, spacing } from '../theme'
import { BarChart } from './charts/BarChart'
import { Heatmap } from './charts/Heatmap'
import { useWorkoutStats, useNutritionWeek, useGoals } from '../lib/queries'
import { summary, weeklyFrequency, volumeTrend, dailyCalories, heatmap, todayISO } from '../lib/stats'

function SummaryCard({ big, label }: { big: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
      <Text variant="stat" color={colors.accent} style={{ fontSize: 22 }}>{big}</Text>
      <Text variant="label" style={{ textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </Card>
  )
}

export function StatsSection() {
  const today = todayISO()
  const { data: workouts, isLoading: wLoading } = useWorkoutStats()
  const { data: week, isLoading: nLoading } = useNutritionWeek(today)
  const { data: goals } = useGoals()

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name="stats-chart" size={20} color={colors.accent} />
      <Text variant="title">İstatistikler</Text>
    </View>
  )

  if (wLoading || nLoading) {
    return (
      <View>
        {header}
        <Card style={{ marginBottom: spacing.lg }}><Text color={colors.textMuted}>İstatistikler yükleniyor...</Text></Card>
      </View>
    )
  }

  const ws = workouts ?? []
  const s = summary(ws)
  const freq = weeklyFrequency(ws)
  const vol = volumeTrend(ws)
  const cals = dailyCalories(week ?? [], today)
  const heat = heatmap(ws)
  const heatMax = Math.max(1, ...heat.flatMap((w) => w.days))
  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const hasWorkouts = ws.length > 0
  const hasCals = cals.some((c) => c.calories > 0)

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {header}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <SummaryCard big={String(s.total)} label="Toplam antrenman" />
        <SummaryCard big={String(s.thisWeek)} label="Bu hafta" />
        <SummaryCard big={`${(s.totalVolumeKg / 1000).toFixed(1)} t`} label="Toplam hacim" />
      </View>

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
        <Card style={{ borderStyle: 'dashed', marginBottom: spacing.md }}>
          <Text variant="label">Henüz antrenman yok — bir antrenman ekleyince istatistikler burada görünecek.</Text>
        </Card>
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
  )
}
