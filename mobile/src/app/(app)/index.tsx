// mobile/src/app/(app)/index.tsx
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Button, EmptyState } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'
import { workoutSummary, weekMomentum } from '../../lib/stats'
import { WeekMomentumHero } from '../../components/workouts/WeekMomentumHero'
import { WorkoutTimelineRow, type TimelineItem } from '../../components/workouts/WorkoutTimelineRow'
import { TemplatesSection } from '../../components/workouts/TemplatesSection'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }

  const list = workouts ?? []
  const m = weekMomentum(list, Date.now())
  const items: TimelineItem[] = list.map((w) => {
    const s = workoutSummary(w.workout_sets ?? [])
    return { id: w.id, date: new Date(w.started_at), setCount: s.setCount, volumeKg: s.volumeKg }
  })

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        onRefresh={refetch}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
            <WeekMomentumHero
              dayDots={m.dayDots}
              todayIndex={m.todayIndex}
              count={m.count}
              volumeKg={m.volumeKg}
              streakWeeks={m.streakWeeks}
            />
            <Button icon="add" title="Antrenmana Başla" onPress={() => router.push('/(app)/new-workout')} style={{ marginBottom: spacing.md }} />
            <TemplatesSection onStart={(id) => router.push(`/(app)/new-workout?templateId=${id}`)} />
            <Text variant="eyebrow" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>GEÇMİŞ</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="barbell-outline" label="Henüz antrenman yok" hint="İlk antrenmanını başlat, geçmişin burada görünsün." />
        }
        renderItem={({ item, index }) => (
          <WorkoutTimelineRow
            item={item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onPress={(id) => router.push(`/(app)/workout/${id}`)}
          />
        )}
      />
    </Screen>
  )
}
