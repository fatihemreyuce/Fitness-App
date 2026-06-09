import { useState } from 'react'
import { Alert, Button, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
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
    setSets((prev) => [
      ...prev,
      { exercise_id: selected.id, exercise_name: selected.name, reps: Number(reps), weight_kg: Number(weight) || 0 },
    ])
    setReps(''); setWeight('')
  }

  function save() {
    if (sets.length === 0) { Alert.alert('Boş', 'En az bir set ekle'); return }
    const numbered = sets.map((s, i) => ({
      exercise_id: s.exercise_id, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg,
    }))
    createWorkout.mutate(
      { notes: null, sets: numbered },
      { onSuccess: () => router.replace('/(app)'), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Egzersiz seç:</Text>
      <FlatList
        horizontal
        data={exercises}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={{
              padding: 10, marginRight: 8, borderRadius: 8,
              backgroundColor: selected?.id === item.id ? '#2563eb' : '#eee',
            }}
          >
            <Text style={{ color: selected?.id === item.id ? '#fff' : '#000' }}>{item.name}</Text>
          </Pressable>
        )}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
        <TextInput placeholder="Tekrar" keyboardType="numeric" value={reps} onChangeText={setReps}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <Button title="Set Ekle" onPress={addSet} />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={sets}
        keyExtractor={(_, i) => String(i)}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Henüz set eklenmedi.</Text>}
        renderItem={({ item, index }) => (
          <Text style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
            {index + 1}. {item.exercise_name} — {item.reps} tekrar × {item.weight_kg} kg
          </Text>
        )}
      />

      <Button title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'}
        onPress={save} disabled={createWorkout.isPending} />
    </View>
  )
}
