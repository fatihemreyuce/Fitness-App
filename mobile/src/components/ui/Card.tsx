import { type ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg }, style]}>
      {children}
    </View>
  )
}
