import { useState } from 'react'
import { Alert, FlatList, View } from 'react-native'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useExercises, useAddExercise } from '../../lib/queries'

export default function Exercises() {
  const { data: exercises, isLoading } = useExercises()
  const addExercise = useAddExercise()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')

  function onAdd() {
    if (!name || !muscle) { Alert.alert('Eksik', 'İsim ve kas grubu gerekli'); return }
    addExercise.mutate({ name, muscle_group: muscle, equipment: null },
      { onSuccess: () => { setName(''); setMuscle('') }, onError: (e) => Alert.alert('Hata', String(e)) })
  }

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Egzersizler</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Input placeholder="Egzersiz adı" value={name} onChangeText={setName} style={{ flex: 1 }} />
        <Input placeholder="Kas grubu" value={muscle} onChangeText={setMuscle} style={{ flex: 1 }} />
        <Button title="Ekle" onPress={onAdd} />
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
            <Text variant="label">{item.muscle_group}{item.equipment ? ` · ${item.equipment}` : ''}</Text>
          </Card>
        )}
      />
    </Screen>
  )
}
