import { FlatList } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text, Card } from '../../../components/ui'
import { colors, spacing } from '../../../theme'
import { useWorkoutSets } from '../../../lib/queries'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenman Detayı</Text>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text color={colors.textMuted}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => (
          <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <Text variant="body">{item.set_number}. {item.exercise.name}</Text>
            <Text variant="label">{item.reps} tekrar × {item.weight_kg} kg</Text>
          </Card>
        )}
      />
    </Screen>
  )
}
