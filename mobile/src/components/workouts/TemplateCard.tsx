import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function TemplateCard({ name, exercises, setCount, onStart, onDelete }: {
  name: string
  exercises: string[]
  setCount: number
  onStart: () => void
  onDelete: () => void
}) {
  const shown = exercises.slice(0, 3)
  const extra = exercises.length - shown.length
  return (
    <View style={{ width: 200, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.accent, borderRadius: radius.lg, padding: spacing.md, marginRight: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>{name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm }}>
        {shown.map((nm, i) => (
          <View key={i} style={{ backgroundColor: colors.cardAlt, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text variant="label" style={{ fontSize: 10 }}>{nm}</Text>
          </View>
        ))}
        {extra > 0 ? (
          <View style={{ backgroundColor: colors.cardAlt, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text variant="label" style={{ fontSize: 10 }}>+{extra}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="label" style={{ fontSize: 11, marginTop: spacing.sm }}>{exercises.length} egzersiz · {setCount} set</Text>
      <Pressable onPress={onStart} style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center', marginTop: spacing.sm }}>
        <Text variant="label" style={{ color: colors.accentText, fontWeight: '800' }}>▶ Başla</Text>
      </Pressable>
    </View>
  )
}
