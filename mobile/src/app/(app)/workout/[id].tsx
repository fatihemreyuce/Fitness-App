import { FlatList } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text } from '../../../components/ui'
import { colors } from '../../../theme'
import { useWorkout, useWorkoutSets } from '../../../lib/queries'
import { workoutSummary, groupSetsByExercise } from '../../../lib/stats'
import { WorkoutStatHeader } from '../../../components/workouts/WorkoutStatHeader'
import { ExerciseSetGroup } from '../../../components/workouts/ExerciseSetGroup'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: workout } = useWorkout(id)
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  const list = sets ?? []
  const s = workoutSummary(list)
  const groups = groupSetsByExercise(list, (x) => x.exercise?.name ?? 'Egzersiz')
  const date = workout ? new Date(workout.started_at) : null

  return (
    <Screen>
      <WorkoutStatHeader
        title={date ? date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Antrenman'}
        subtitle={date ? date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : undefined}
        stats={[
          { value: String(s.setCount), label: 'set' },
          { value: `${(s.volumeKg / 1000).toFixed(1)} t`, label: 'hacim' },
          { value: String(s.exercises.length), label: 'egzersiz' },
        ]}
      />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.exerciseName}
        ListEmptyComponent={<Text color={colors.textMuted}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => <ExerciseSetGroup exerciseName={item.exerciseName} sets={item.sets} />}
      />
    </Screen>
  )
}
