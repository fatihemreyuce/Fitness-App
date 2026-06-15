// mobile/src/components/auth/FadeOverlay.tsx
import { View } from 'react-native'

// Pure-View dikey gradient: üst saydam → alt opak `color`. expo-linear-gradient YOK = OTA-safe.
// Eşit yükseklikte `steps` bant; opaklık `from`→`to` doğrusal artar.
export function FadeOverlay({
  height,
  color = '#0d0f12',
  from = 0,
  to = 1,
  steps = 14,
}: {
  height: number
  color?: string
  from?: number
  to?: number
  steps?: number
}) {
  return (
    <View style={{ height }} pointerEvents="none">
      {Array.from({ length: steps }).map((_, i) => {
        const t = steps > 1 ? i / (steps - 1) : 1
        return <View key={i} style={{ flex: 1, backgroundColor: color, opacity: from + (to - from) * t }} />
      })}
    </View>
  )
}
