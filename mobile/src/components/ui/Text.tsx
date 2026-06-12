import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { colors } from '../../theme'

type Variant = 'title' | 'subtitle' | 'body' | 'label' | 'stat' | 'eyebrow'
const styles: Record<Variant, TextStyle> = {
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  stat: { fontSize: 28, fontWeight: '800', color: colors.text },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
}

export function Text({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const base = styles[variant]
  return <RNText {...rest} style={[base, color ? { color } : null, style]} />
}
