import { View, FlatList, Alert } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { useTemplates, useDeleteTemplate } from '../../lib/queries'
import { TemplateCard } from './TemplateCard'

export function TemplatesSection({ onStart }: { onStart: (templateId: string) => void }) {
  const { data: templates } = useTemplates()
  const deleteTemplate = useDeleteTemplate()

  if (!templates || templates.length === 0) return null

  function confirmDelete(id: string, name: string) {
    Alert.alert('Şablonu sil', `"${name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTemplate.mutate(id) },
    ])
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="label" style={{ marginBottom: spacing.sm }}>⚡ Şablonlarım</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={templates}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const names: string[] = []
          for (const s of item.workout_template_sets ?? []) {
            const n = s.exercise?.name ?? 'Egzersiz'
            if (!names.includes(n)) names.push(n)
          }
          return (
            <TemplateCard
              name={item.name}
              exercises={names}
              setCount={(item.workout_template_sets ?? []).length}
              onStart={() => onStart(item.id)}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )
        }}
      />
    </View>
  )
}
