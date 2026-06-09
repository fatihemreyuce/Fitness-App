import { useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useExercises, useCreateWorkout, type Exercise } from '../../lib/queries'

type DraftSet = { exercise_id: string; exercise_name: string; reps: number; weight_kg: number }

export default function NewWorkout() {
  const { data: exercises } = useExercises()
  const createWorkout = useCreateWorkout()
  const router = useRouter()
  const [sets, setSets] = useState<DraftSet[]>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  function addSet() {
    if (!selected || !reps) { Alert.alert('Eksik', 'Egzersiz ve tekrar gerekli'); return }
    setSets((prev) => [...prev, { exercise_id: selected.id, exercise_name: selected.name, reps: Number(reps), weight_kg: Number(weight) || 0 }])
    setReps(''); setWeight('')
  }

  function save() {
    if (sets.length === 0) { Alert.alert('Boş', 'En az bir set ekle'); return }
    const numbered = sets.map((s, i) => ({ exercise_id: s.exercise_id, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg }))
    createWorkout.mutate({ notes: null, sets: numbered }, { onSuccess: () => router.replace('/(app)'), onError: (e) => Alert.alert('Hata', String(e)) })
  }

  return (
    <Screen>
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
        <Button title="Set Ekle" onPress={addSet} />
      </View>
      <FlatList
        style={{ flex: 1 }} data={sets} keyExtractor={(_, i) => String(i)}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz set eklenmedi.</Text>}
        renderItem={({ item, index }) => (
          <Text variant="body" style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
            {index + 1}. {item.exercise_name} — {item.reps} tekrar × {item.weight_kg} kg
          </Text>
        )}
      />
      <Button title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'} onPress={save} disabled={createWorkout.isPending} style={{ marginTop: spacing.sm }} />
    </Screen>
  )
}
