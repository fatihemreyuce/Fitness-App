// mobile/src/components/workouts/WeekMomentumHero.tsx
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

const DAY_LABELS = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'] // Pzt Sal Çar Per Cum Cmt Paz

export function WeekMomentumHero({
  dayDots,
  todayIndex,
  count,
  volumeKg,
  streakWeeks,
}: {
  dayDots: boolean[]
  todayIndex: number
  count: number
  volumeKg: number
  streakWeeks: number
}) {
  return (
    <LinearGradient
      colors={['#1a2410', colors.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md }}
    >
      <Text variant="eyebrow" style={{ marginBottom: spacing.md }}>BU HAFTA</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
        {dayDots.map((on, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 5 }}>
            <Text variant="label" color={i === todayIndex ? colors.text : colors.textFaint} style={{ fontSize: 10 }}>
              {DAY_LABELS[i]}
            </Text>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: on ? colors.accent : i === todayIndex ? 'transparent' : colors.cardAlt,
                borderWidth: i === todayIndex && !on ? 1 : 0,
                borderColor: colors.accent,
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.lg }}>
        <Text variant="body" color={colors.text} style={{ fontWeight: '800', fontSize: 22 }}>
          {count}
          <Text variant="label"> antrenman</Text>
        </Text>
        <Text variant="body" color={colors.text} style={{ fontWeight: '800', fontSize: 22 }}>
          {(volumeKg / 1000).toFixed(1)}
          <Text variant="label">t hacim</Text>
        </Text>
        {streakWeeks > 0 ? (
          <Text variant="label" color={colors.accent} style={{ marginLeft: 'auto', fontWeight: '700' }}>
            🔥 {streakWeeks} hafta
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  )
}
