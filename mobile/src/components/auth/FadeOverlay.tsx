// mobile/src/components/auth/FadeOverlay.tsx
import { View } from 'react-native'

// Pure-View dikey gradient: üst saydam → alt opak `color`. expo-linear-gradient YOK = OTA-safe.
// Banding'i (çizgi çizgi) önlemek için yüksekliğe göre çok sayıda ince bant kullanılır
// (~4px/bant → bant başına opaklık değişimi ~0.01, görünmez geçiş).
export function FadeOverlay({
  height,
  color = '#0d0f12',
  from = 0,
  to = 1,
  steps,
}: {
  height: number
  color?: string
  from?: number
  to?: number
  steps?: number
}) {
  const n = steps ?? Math.max(24, Math.round(height / 4))
  return (
    <View style={{ height }} pointerEvents="none">
      {Array.from({ length: n }).map((_, i) => {
        const t = n > 1 ? i / (n - 1) : 1
        return <View key={i} style={{ flex: 1, backgroundColor: color, opacity: from + (to - from) * t }} />
      })}
    </View>
  )
}
