// mobile/src/components/charts/CalorieRing.tsx
import { type ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors } from '../../theme'

// Dairesel ilerleme halkası (react-native-svg). Tepeden saat yönünde dolar.
// children halkanın ortasında gösterilir.
export function CalorieRing({
  progress,
  size = 168,
  stroke = 14,
  color = colors.accent,
  trackColor = colors.cardAlt,
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  const r = (size - stroke) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - p)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      {children}
    </View>
  )
}
