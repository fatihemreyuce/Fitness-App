import { FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'
import { workoutSummary } from '../../lib/stats'
import { WorkoutCard } from '../../components/workouts/WorkoutCard'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
      <Button icon="add" title="Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: spacing.lg }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => {
          const s = workoutSummary(item.workout_sets ?? [])
          return (
            <WorkoutCard
              date={new Date(item.started_at)}
              exercises={s.exercises}
              setCount={s.setCount}
              volumeKg={s.volumeKg}
              onPress={() => router.push(`/(app)/workout/${item.id}`)}
            />
          )
        }}
      />
    </Screen>
  )
}
