import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card, Input, Button } from './ui'
import { colors, spacing } from '../theme'
import { WeightLineChart } from './charts/WeightLineChart'
import {
  useBodyWeights,
  useUpsertBodyWeight,
  useDeleteBodyWeight,
  useTargetWeight,
  useUpdateTargetWeight,
} from '../lib/queries'
import { weightSummary, weightChartPoints, todayISO } from '../lib/stats'

export function WeightSection() {
  const { data: entries, isLoading } = useBodyWeights()
  const { data: target } = useTargetWeight()
  const upsert = useUpsertBodyWeight()
  const del = useDeleteBodyWeight()
  const updateTarget = useUpdateTargetWeight()
  const [weight, setWeight] = useState('')
  const [goalInput, setGoalInput] = useState('')

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name="scale-outline" size={20} color={colors.accent} />
      <Text variant="title">Kilo Takibi</Text>
    </View>
  )

  if (isLoading) {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        {header}
        <Card><Text color={colors.textMuted}>Yükleniyor...</Text></Card>
      </View>
    )
  }

  const list = entries ?? []
  const { current, change7d } = weightSummary(list)
  const points = weightChartPoints(list, 30)
  const recent = [...list].reverse().slice(0, 10) // son → eski
  const remaining =
    current != null && target != null ? Number((current - target).toFixed(1)) : null

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

  function saveGoal() {
    const kg = goalInput.trim() ? Number(goalInput.replace(',', '.')) : null
    if (kg !== null && (!Number.isFinite(kg) || kg <= 0)) {
      Alert.alert('Geçersiz', "Hedef 0'dan büyük olmalı")
      return
    }
    updateTarget.mutate(kg, {
      onSuccess: () => {
        setGoalInput('')
        Alert.alert('Kaydedildi', kg ? `Hedef ${kg} kg` : 'Hedef kaldırıldı')
      },
      onError: (e) => Alert.alert('Hata', String(e)),
    })
  }

  function removeEntry(id: string, date: string) {
    Alert.alert('Sil', `${date} kaydını sil?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ])
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {header}

      <Card style={{ marginBottom: spacing.md }}>
        {current != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.md }}>
            <Text variant="stat" color={colors.accent}>{current} kg</Text>
            {change7d != null ? (
              <Text variant="label" color={change7d <= 0 ? colors.accent : colors.fat} style={{ marginBottom: 6 }}>
                {change7d > 0 ? '+' : ''}{change7d} kg / 7g
              </Text>
            ) : null}
          </View>
        ) : (
          <Text color={colors.textMuted} style={{ marginBottom: spacing.md }}>
            Henüz kilo kaydı yok — bugünkü kilonu ekle.
          </Text>
        )}

        {target != null ? (
          <Text variant="label" style={{ marginBottom: spacing.md }}>
            🎯 Hedef {target} kg
            {remaining != null && remaining !== 0
              ? ` · ${Math.abs(remaining)} kg ${remaining > 0 ? 'kaldı' : 'aşıldı'}`
              : remaining === 0 ? ' · ulaşıldı 🎉' : ''}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input placeholder="Bugünkü kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
          <Button title="Ekle" onPress={addWeight} loading={upsert.isPending} />
        </View>
      </Card>

      {points.length >= 1 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="label" style={{ marginBottom: spacing.md }}>Son 30 gün</Text>
          <WeightLineChart points={points} goal={target ?? undefined} />
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.sm }}>Hedef kilo</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input
            placeholder={target != null ? String(target) : 'Hedef kilo (kg)'}
            keyboardType="numeric"
            value={goalInput}
            onChangeText={setGoalInput}
            style={{ flex: 1 }}
          />
          <Button title="Kaydet" variant="ghost" onPress={saveGoal} loading={updateTarget.isPending} />
        </View>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <Text variant="label" style={{ marginBottom: spacing.sm }}>Son kayıtlar</Text>
          <View style={{ gap: spacing.xs }}>
            {recent.map((e) => (
              <View
                key={e.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
              >
                <Text>{e.entry_date}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Text variant="subtitle">{e.weight_kg} kg</Text>
                  <Pressable onPress={() => removeEntry(e.id, e.entry_date)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  )
}
