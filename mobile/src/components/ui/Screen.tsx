import { type ReactNode } from 'react'
import { ScrollView, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../../theme'

export function Screen({ children, scroll = false, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const inner = { flex: 1, backgroundColor: colors.bg, padding: spacing.lg } as ViewStyle
  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: spacing.lg }, style]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[inner, style]}>{children}</View>
    </SafeAreaView>
  )
}
