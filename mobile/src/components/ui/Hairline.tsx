import { View } from 'react-native'
import { colors, spacing } from '../../theme'

export function Hairline() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
}
