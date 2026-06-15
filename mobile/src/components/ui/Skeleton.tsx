// mobile/src/components/ui/Skeleton.tsx
import { useEffect, useRef } from 'react'
import { Animated, type DimensionValue, type ViewStyle } from 'react-native'
import { colors } from '../../theme'

// Nabız atan placeholder kutusu (opaklık 0.4↔1). useNativeDriver — OTA-safe.
export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width: DimensionValue
  height: number
  radius?: number
  style?: ViewStyle
}) {
  const opacity = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.cardAlt, opacity }, style]}
    />
  )
}
