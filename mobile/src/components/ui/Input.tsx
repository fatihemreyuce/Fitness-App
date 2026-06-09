import { TextInput, type TextInputProps } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 15 },
        props.style,
      ]}
    />
  )
}
