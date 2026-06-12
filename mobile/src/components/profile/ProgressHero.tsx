import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Text, Input, Button, ProgressBar } from '../ui'
import { colors, spacing, radius } from '../../theme'
import { useBodyWeights, useUpsertBodyWeight, useTargetWeight } from '../../lib/queries'
import { weightSummary, todayISO } from '../../lib/stats'

export function ProgressHero() {
  const { data: entries } = useBodyWeights()
  const { data: target } = useTargetWeight()
  const upsert = useUpsertBodyWeight()
  const [weight, setWeight] = useState('')

  const list = entries ?? []
  const { current, change7d } = weightSummary(list)
  // hedefe ilerleme: başlangıç = en eski kayıt; |current-target| / |start-target|
  const start = list.length > 0 ? list[0].weight_kg : null
  const remaining = current != null && target != null ? Number((current - target).toFixed(1)) : null
  const progress =
    current != null && target != null && start != null && start !== target
      ? Math.max(0, Math.min(1, (Math.abs(start - current)) / (Math.abs(start - target))))
      : 0
  const showBar = current != null && target != null && list.length >= 2

  function addWeight() {
    const kg = Number(weight.replace(',', '.'))
    if (!weight.trim() || !Number.isFinite(kg) || kg <= 0) {
      Alert.alert('Geçersiz', "Lütfen 0'dan büyük bir kilo gir")
      return
    }
    upsert.mutate(
      { entry_date: todayISO(), weight_kg: kg },
      { onSuccess: () => setWeight(''), onError: (e) => Alert.alert('Hata', String(e)) },
    )
  }

  return (
    <View>
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Güncel Kilo</Text>

      {current != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 42, fontWeight: '800', color: colors.text }}>
            {current}<Text color={colors.textMuted} style={{ fontSize: 15 }}> kg</Text>
          </Text>
          {change7d != null ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, marginBottom: 6 }}>
              <Text variant="label" color={change7d <= 0 ? colors.accent : colors.fat}>
                {change7d <= 0 ? '↓' : '↑'} {Math.abs(change7d)} / 7g
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text color={colors.textMuted}>Henüz kilo kaydı yok — bugünkü kilonu ekle.</Text>
      )}

      {showBar ? (
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar value={progress} height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <Text variant="label">🎯 Hedef {target} kg{remaining != null && remaining !== 0 ? ` · ${Math.abs(remaining)} kg ${remaining > 0 ? 'kaldı' : 'aşıldı'}` : ''}</Text>
            <Text variant="label" color={colors.accent}>{remaining === 0 ? 'ulaştın! 🎉' : progress >= 0.5 ? 'yarı yoldasın' : 'devam et'}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Input placeholder="Bugünkü kilonu gir (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
        <Button title="Ekle" icon="add" onPress={addWeight} loading={upsert.isPending} />
      </View>
    </View>
  )
}
