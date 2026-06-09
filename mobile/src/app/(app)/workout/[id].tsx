import { FlatList, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useWorkoutSets } from '../../../lib/queries'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Antrenman Detayı</Text>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 16 }}>{item.set_number}. {item.exercise.name}</Text>
            <Text style={{ color: '#666' }}>{item.reps} tekrar × {item.weight_kg} kg</Text>
          </View>
        )}
      />
    </View>
  )
}
