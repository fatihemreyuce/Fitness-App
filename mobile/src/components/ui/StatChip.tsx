import { View } from 'react-native'
import { colors, radius, spacing } from '../../theme'
import { Text } from './Text'

export function StatChip({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
      <Text variant="subtitle" color={color}>{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  )
}
