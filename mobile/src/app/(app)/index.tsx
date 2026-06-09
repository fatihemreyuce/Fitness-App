import { FlatList, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Card, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
      <Button title="+ Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: spacing.lg }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(app)/workout/${item.id}`)} style={{ marginBottom: spacing.sm }}>
            <Card style={{ padding: spacing.md }}>
              <Text variant="body">{new Date(item.started_at).toLocaleString('tr-TR')}</Text>
              {item.notes ? <Text variant="label">{item.notes}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
