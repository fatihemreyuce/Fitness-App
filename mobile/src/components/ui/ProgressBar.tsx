import { View } from 'react-native'
import { colors, radius } from '../../theme'

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, isFinite(value) ? value : 0))
  return (
    <View style={{ height: 8, backgroundColor: colors.cardAlt, borderRadius: radius.sm, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  )
}
