import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { colors, radius } from '../../theme'

// width % native sürücü kullanamaz → useNativeDriver:false (JS-driven, OTA-safe).
export function ProgressBar({ value, color = colors.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, isFinite(value) ? value : 0))
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 400, useNativeDriver: false }).start()
  }, [pct, anim])
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <View style={{ height, backgroundColor: colors.cardAlt, borderRadius: radius.sm, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  )
}
