import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../theme'

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon, style }:
  { title: string; onPress: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle }) {
  const isPrimary = variant === 'primary'
  const fg = isPrimary ? colors.accentText : colors.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
        isPrimary ? { backgroundColor: colors.accent } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        (disabled || loading) ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text style={{ fontWeight: '700', fontSize: 15, color: fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}
