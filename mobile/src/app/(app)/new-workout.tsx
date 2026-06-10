import { useEffect, useRef, useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useExercises, useCreateWorkout, useTemplateDraft, type Exercise } from '../../lib/queries'
import { groupSetsByExercise, type DraftSet } from '../../lib/stats'
import { ExerciseSetGroup } from '../../components/workouts/ExerciseSetGroup'

export default function NewWorkout() {
  const { data: exercises } = useExercises()
  const createWorkout = useCreateWorkout()
  const router = useRouter()
  const { templateId } = useLocalSearchParams<{ templateId?: string }>()
  const { data: tplData } = useTemplateDraft(templateId)
  const seeded = useRef(false)
  useEffect(() => {
    if (tplData && !seeded.current) {
      setSets(tplData.draft)
      seeded.current = true
    }
  }, [tplData])
  const [sets, setSets] = useState<DraftSet[]>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  function addSet() {
    if (!selected || !reps) { Alert.alert('Eksik', 'Egzersiz ve tekrar gerekli'); return }
    setSets((prev) => [...prev, { exercise_id: selected.id, exercise_name: selected.name, reps: Number(reps), weight_kg: Number(weight) || 0 }])
    setReps(''); setWeight('')
  }

  function removeSet(globalIndex: number) {
    setSets((prev) => prev.filter((_, i) => i !== globalIndex))
  }

  function save() {
    if (sets.length === 0) { Alert.alert('Boş', 'En az bir set ekle'); return }
    const numbered = sets.map((s, i) => ({ exercise_id: s.exercise_id, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg }))
    createWorkout.mutate({ notes: null, sets: numbered }, { onSuccess: () => router.replace('/(app)'), onError: (e) => Alert.alert('Hata', String(e)) })
  }

  return (
    <Screen>
      {tplData?.name ? <Text variant="title" style={{ marginBottom: spacing.sm }}>{tplData.name}</Text> : null}
      <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>Egzersiz seç</Text>
      <FlatList
        horizontal data={exercises} keyExtractor={(i) => i.id} showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)}
            style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginRight: spacing.sm, borderRadius: radius.md, backgroundColor: selected?.id === item.id ? colors.accent : colors.cardAlt }}>
            <Text variant="body" color={selected?.id === item.id ? colors.accentText : colors.text}>{item.name}</Text>
          </Pressable>
        )}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md }}>
        <Input placeholder="Tekrar" keyboardType="numeric" value={reps} onChangeText={setReps} style={{ flex: 1 }} />
        <Input placeholder="Kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
        <Button icon="add" title="Set" onPress={addSet} />
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={groupSetsByExercise(sets.map((s, i) => ({ ...s, _i: i })), (s) => s.exercise_name)}
        keyExtractor={(g) => g.exerciseName}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz set eklenmedi.</Text>}
        renderItem={({ item }) => (
          <ExerciseSetGroup
            exerciseName={item.exerciseName}
            sets={item.sets}
            onDeleteSet={(gi) => removeSet(item.sets[gi]._i)}
          />
        )}
      />
      {sets.length > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#c8ff0012', borderWidth: 1, borderColor: '#c8ff0033', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, marginVertical: spacing.sm }}>
          <Text variant="label">Toplam</Text>
          <Text variant="body" color={colors.accent} style={{ fontWeight: '700' }}>
            {sets.length} set · {(sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0) / 1000).toFixed(1)} t
          </Text>
        </View>
      ) : null}
      <Button icon="checkmark" title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'} onPress={save} disabled={createWorkout.isPending} style={{ marginTop: spacing.sm }} />
    </Screen>
  )
}
