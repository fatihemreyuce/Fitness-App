import { Button, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useWorkouts } from '../../lib/queries'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="+ Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: 16 }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/workout/${item.id}`)}
            style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee' }}
          >
            <Text style={{ fontSize: 16 }}>
              {new Date(item.started_at).toLocaleString('tr-TR')}
            </Text>
            {item.notes ? <Text style={{ color: '#666' }}>{item.notes}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  )
}
