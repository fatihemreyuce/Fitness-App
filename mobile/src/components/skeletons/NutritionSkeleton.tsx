// mobile/src/components/skeletons/NutritionSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function NutritionSkeleton() {
  return (
    <Screen scroll>
      <Skeleton width={130} height={12} style={{ marginBottom: spacing.sm }} />
      <Skeleton width={90} height={26} style={{ marginBottom: spacing.lg }} />
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Skeleton width={168} height={168} radius={84} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={11} />
            <Skeleton width="100%" height={6} radius={3} />
          </View>
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={52} radius={12} />
        </View>
      ))}
    </Screen>
  )
}
