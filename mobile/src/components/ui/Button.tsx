import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, style }:
  { title: string; onPress: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
        isPrimary ? { backgroundColor: colors.accent } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        (disabled || loading) ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? colors.accentText : colors.text} />
        : <Text style={{ fontWeight: '700', fontSize: 15, color: isPrimary ? colors.accentText : colors.text }}>{title}</Text>}
    </Pressable>
  )
}
