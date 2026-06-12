import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, spacing } from '../../theme'

export function EmptyState({ icon, label, hint }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text variant="subtitle" color={colors.textMuted} style={{ textAlign: 'center' }}>{label}</Text>
      {hint ? <Text variant="label" color={colors.textFaint} style={{ textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  )
}
