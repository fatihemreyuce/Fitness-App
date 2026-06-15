// mobile/src/components/skeletons/DetailSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function DetailSkeleton() {
  return (
    <Screen>
      <Skeleton width={80} height={11} style={{ marginBottom: spacing.sm }} />
      <Skeleton width={180} height={26} style={{ marginBottom: spacing.lg }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="32%" height={56} radius={12} />
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width={70} height={14} />
        </View>
      ))}
    </Screen>
  )
}
