import { useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

// Saf-View çizgi grafiği (OTA-safe, native yok).
// points: kronolojik kilo dizisi. goal: opsiyonel hedef çizgisi.
export function WeightLineChart({
  points,
  goal,
  height = 96,
}: {
  points: number[]
  goal?: number
  height?: number
}) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  if (points.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text variant="label">Yeterli veri yok</Text>
      </View>
    )
  }

  // Ölçek: nokta(+hedef) min–max'ına tampon ekleyerek yakınlaştır.
  const values = goal != null ? [...points, goal] : points
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  } else {
    const pad = (max - min) * 0.15
    min -= pad
    max += pad
  }

  const n = points.length
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : width / 2)
  const y = (v: number) => height - ((v - min) / (max - min)) * height

  const segments: { left: number; top: number; width: number; angle: number }[] = []
  for (let i = 0; i < n - 1; i++) {
    const x1 = x(i)
    const y1 = y(points[i])
    const x2 = x(i + 1)
    const y2 = y(points[i + 1])
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    segments.push({ left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, angle })
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 ? (
        <>
          {goal != null ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: y(goal),
                borderTopWidth: 1.5,
                borderColor: colors.fat,
                borderStyle: 'dashed',
              }}
            />
          ) : null}
          {segments.map((s, i) => (
            <View
              key={`s${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: s.width,
                height: 2,
                borderRadius: 1,
                backgroundColor: colors.accent,
                transform: [{ rotate: `${s.angle}deg` }],
              }}
            />
          ))}
          {points.map((v, i) => (
            <View
              key={`p${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: x(i) - 3,
                top: y(v) - 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          ))}
        </>
      ) : null}
    </View>
  )
}
