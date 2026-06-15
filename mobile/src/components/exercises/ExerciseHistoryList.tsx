// mobile/src/components/exercises/ExerciseHistoryList.tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import type { Session } from '../../lib/exercises'

function fmtDate(day: string): string {
  const d = new Date(`${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

function fmtVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`
}

export function ExerciseHistoryList({ sessions }: { sessions: Session[] }) {
  return (
    <View>
      {sessions.map((s) => (
        <View key={s.date} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" color={colors.text}>{fmtDate(s.date)}</Text>
            <Text variant="label" color={colors.textFaint}>{s.sets.length} set · {fmtVolume(s.volume)}</Text>
          </View>
          <Text variant="label" color={colors.textMuted} style={{ marginTop: 3 }}>
            {s.sets.map((x) => `${x.weight_kg}×${x.reps}`).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  )
}
