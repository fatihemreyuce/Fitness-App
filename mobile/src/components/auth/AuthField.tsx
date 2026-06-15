// mobile/src/components/auth/AuthField.tsx
import { useState } from 'react'
import { View, TextInput, Pressable, type TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../theme'

// Hero üzerinde yarı-saydam input. `secure` → sağda göster/gizle toggle.
export function AuthField({
  icon,
  secure = false,
  ...props
}: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; secure?: boolean }) {
  const [hidden, setHidden] = useState(secure)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        placeholderTextColor={colors.textMuted}
        secureTextEntry={hidden}
        {...props}
        style={{ flex: 1, paddingVertical: 14, color: colors.text, fontSize: 15 }}
      />
      {secure ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  )
}
