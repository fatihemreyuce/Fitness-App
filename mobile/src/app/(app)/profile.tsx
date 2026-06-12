import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { spacing } from '../../theme'
import { useGoals, useUpdateGoals, useDisplayName } from '../../lib/queries'
import { StatsSection } from '../../components/StatsSection'
import { WeightSection } from '../../components/WeightSection'

export default function Profile() {
  const { session } = useAuth()
  const { data: displayName } = useDisplayName()
  const { data: goals } = useGoals()
  const updateGoals = useUpdateGoals()
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')

  useEffect(() => {
    if (goals) { setCal(goals.daily_calorie_goal?.toString() ?? ''); setProt(goals.daily_protein_goal?.toString() ?? '') }
  }, [goals])

  function saveGoals() {
    updateGoals.mutate(
      { daily_calorie_goal: cal ? Number(cal) : null, daily_protein_goal: prot ? Number(prot) : null },
      { onSuccess: () => Alert.alert('Kaydedildi', 'Hedeflerin güncellendi'), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Profil</Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="label">AD</Text>
        <Text variant="subtitle" style={{ marginBottom: spacing.md }}>{displayName ?? '...'}</Text>
        <Text variant="label">E-POSTA</Text>
        <Text variant="subtitle">{session?.user.email}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Günlük Hedefler</Text>
        <View style={{ gap: spacing.md }}>
          <Input placeholder="Kalori hedefi (kcal)" keyboardType="numeric" value={cal} onChangeText={setCal} />
          <Input placeholder="Protein hedefi (g)" keyboardType="numeric" value={prot} onChangeText={setProt} />
          <Button title={updateGoals.isPending ? 'Kaydediliyor...' : 'Hedefleri Kaydet'} onPress={saveGoals} disabled={updateGoals.isPending} />
        </View>
      </Card>

      <WeightSection />

      <StatsSection />

      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </Screen>
  )
}
