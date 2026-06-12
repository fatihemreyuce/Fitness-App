import { useCallback, useState } from 'react'
import { Alert, LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { WeightLineChart } from '../charts/WeightLineChart'
import { useBodyWeights, useDeleteBodyWeight } from '../../lib/queries'
import { weightChartPoints } from '../../lib/stats'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function WeightTrend() {
  const { data: entries } = useBodyWeights()
  const del = useDeleteBodyWeight()
  const [open, setOpen] = useState(false)

  const list = entries ?? []
  const points = weightChartPoints(list, 30)
  const recent = [...list].reverse().slice(0, 10)

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((o) => !o)
  }, [])

  function removeEntry(id: string, date: string) {
    Alert.alert('Sil', `${date} kaydını sil?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ])
  }

  if (points.length < 1) return null

  return (
    <View>
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Son 30 gün</Text>
      <WeightLineChart points={points} height={110} />

      {recent.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Pressable onPress={toggle} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }, pressed && { opacity: 0.7 }]}>
            <Text variant="eyebrow">Kilo kayıtları ({recent.length})</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </Pressable>
          {open ? (
            <View style={{ gap: spacing.xs }}>
              {recent.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text color={colors.textMuted}>{e.entry_date}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Text variant="subtitle">{e.weight_kg} kg</Text>
                    <Pressable onPress={() => removeEntry(e.id, e.entry_date)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kaydı sil">
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
