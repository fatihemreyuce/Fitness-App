// mobile/src/components/skeletons/ExercisesSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function ExercisesSkeleton() {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Skeleton width={140} height={26} />
        <Skeleton width={90} height={34} radius={12} />
      </View>
      <Skeleton width="100%" height={46} radius={12} style={{ marginBottom: spacing.sm }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {[60, 50, 56, 48].map((w, i) => (
          <Skeleton key={i} width={w} height={30} radius={16} />
        ))}
      </View>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={50} height={14} />
        </View>
      ))}
    </Screen>
  )
}
