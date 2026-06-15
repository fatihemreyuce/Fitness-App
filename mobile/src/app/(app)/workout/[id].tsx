import { useState } from 'react'
import { FlatList, Modal, View, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text, Button, Input } from '../../../components/ui'
import { colors, spacing } from '../../../theme'
import { useWorkout, useWorkoutSets, useCreateTemplateFromWorkout } from '../../../lib/queries'
import { workoutSummary, groupSetsByExercise } from '../../../lib/stats'
import { WorkoutStatHeader } from '../../../components/workouts/WorkoutStatHeader'
import { ExerciseSetGroup } from '../../../components/workouts/ExerciseSetGroup'
import { DetailSkeleton } from '../../../components/skeletons/DetailSkeleton'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: workout } = useWorkout(id)
  const { data: sets, isLoading } = useWorkoutSets(id)
  const createTemplate = useCreateTemplateFromWorkout()
  const [modalOpen, setModalOpen] = useState(false)
  const [tplName, setTplName] = useState('')

  if (isLoading) return <DetailSkeleton />

  const list = sets ?? []
  const s = workoutSummary(list)
  const groups = groupSetsByExercise(list, (x) => x.exercise?.name ?? 'Egzersiz')
  const date = workout ? new Date(workout.started_at) : null

  function saveTemplate() {
    const name = tplName.trim() || 'Antrenman'
    const tplSets = list.map((x) => ({
      exercise_id: x.exercise_id,
      set_number: x.set_number,
      target_reps: x.reps,
      target_weight_kg: x.weight_kg,
    }))
    createTemplate.mutate({ name, sets: tplSets }, {
      onSuccess: () => { setModalOpen(false); setTplName(''); Alert.alert('Kaydedildi', 'Şablon oluşturuldu.') },
      onError: (e) => Alert.alert('Hata', String(e)),
    })
  }

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
      <Button icon="bookmark" title="Şablon olarak kaydet" variant="ghost" onPress={() => setModalOpen(true)} style={{ marginBottom: spacing.md }} />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.exerciseName}
        ListEmptyComponent={<Text color={colors.textMuted}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => <ExerciseSetGroup exerciseName={item.exerciseName} sets={item.sets} />}
      />
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, gap: spacing.md }}>
            <Text variant="subtitle">Şablon adı</Text>
            <Input placeholder="örn. Push Day" value={tplName} onChangeText={setTplName} autoFocus />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Vazgeç" variant="ghost" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
              <Button title={createTemplate.isPending ? '...' : 'Kaydet'} onPress={saveTemplate} disabled={createTemplate.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
