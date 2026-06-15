// mobile/src/components/skeletons/WorkoutsSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function WorkoutsSkeleton() {
  return (
    <Screen>
      <Skeleton width={160} height={26} style={{ marginBottom: spacing.md }} />
      <Skeleton width="100%" height={120} radius={16} style={{ marginBottom: spacing.md }} />
      <Skeleton width="100%" height={48} radius={12} style={{ marginBottom: spacing.lg }} />
      <Skeleton width={90} height={12} style={{ marginBottom: spacing.md }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Skeleton width={10} height={10} radius={5} />
          <Skeleton width="55%" height={14} />
          <View style={{ flex: 1 }} />
          <Skeleton width={70} height={12} />
        </View>
      ))}
    </Screen>
  )
}
