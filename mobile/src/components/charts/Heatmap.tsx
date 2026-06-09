import { View } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

const SHADES = ['#5e7a00', '#9ac800', '#c8ff00']

export type HeatWeek = { weekLabel: string; days: number[] }

export function Heatmap({ weeks, max }: { weeks: HeatWeek[]; max: number }) {
  function cellColor(v: number): string {
    if (v <= 0) return colors.border
    const ratio = v / max
    const idx = ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0
    return SHADES[idx]
  }
  return (
    <View>
      {weeks.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Text variant="label" style={{ width: 44, fontSize: 9 }}>{w.weekLabel}</Text>
          <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
            {w.days.map((d, j) => (
              <View key={j} style={{ flex: 1, aspectRatio: 1, maxWidth: 20, borderRadius: 3, backgroundColor: cellColor(d) }} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 6 }}>
        <Text variant="label" style={{ fontSize: 9 }}>az</Text>
        {[colors.border, ...SHADES].map((c, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: c }} />
        ))}
        <Text variant="label" style={{ fontSize: 9 }}>çok</Text>
      </View>
    </View>
  )
}
