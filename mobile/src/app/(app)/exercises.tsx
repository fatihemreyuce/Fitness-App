import { useState } from 'react'
import { Alert, Button, FlatList, Text, TextInput, View } from 'react-native'
import { useExercises, useAddExercise } from '../../lib/queries'

export default function Exercises() {
  const { data: exercises, isLoading } = useExercises()
  const addExercise = useAddExercise()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')

  function onAdd() {
    if (!name || !muscle) { Alert.alert('Eksik', 'İsim ve kas grubu gerekli'); return }
    addExercise.mutate(
      { name, muscle_group: muscle, equipment: null },
      { onSuccess: () => { setName(''); setMuscle('') }, onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput placeholder="Egzersiz adı" value={name} onChangeText={setName}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Kas grubu" value={muscle} onChangeText={setMuscle}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <Button title="Ekle" onPress={onAdd} />
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 16 }}>
              {item.name} {item.owner_id ? '⭐' : ''}
            </Text>
            <Text style={{ color: '#666' }}>{item.muscle_group}{item.equipment ? ` · ${item.equipment}` : ''}</Text>
          </View>
        )}
      />
    </View>
  )
}
