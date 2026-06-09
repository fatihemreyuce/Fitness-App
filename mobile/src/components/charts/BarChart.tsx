import { View } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

export type Bar = { label: string; value: number }

export function BarChart({
  data,
  color = colors.accent,
  height = 100,
  goal,
  overColor = colors.fat,
  goalColor = colors.fat,
  showValues = false,
  formatValue,
}: {
  data: Bar[]
  color?: string
  height?: number
  goal?: number
  overColor?: string
  goalColor?: string
  showValues?: boolean
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value), goal ?? 0)
  return (
    <View>
      <View style={{ position: 'relative', height, flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
        {goal && goal > 0 ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: (goal / max) * height, borderTopWidth: 1.5, borderColor: goalColor, borderStyle: 'dashed' }}
          />
        ) : null}
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            {showValues ? (
              <Text variant="label" style={{ fontSize: 9 }}>{formatValue ? formatValue(d.value) : String(d.value)}</Text>
            ) : null}
            <View
              style={{
                width: '100%',
                height: Math.max(2, (d.value / max) * height),
                backgroundColor: goal && d.value >= goal ? overColor : color,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 5 }}>
        {data.map((d, i) => (
          <Text key={i} variant="label" style={{ flex: 1, textAlign: 'center', fontSize: 9 }}>{d.label}</Text>
        ))}
      </View>
    </View>
  )
}
