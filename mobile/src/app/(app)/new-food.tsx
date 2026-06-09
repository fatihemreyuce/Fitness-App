import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { spacing } from '../../theme'
import { useAddCustomFood } from '../../lib/queries'

export default function NewFood() {
  const router = useRouter()
  const add = useAddCustomFood()
  const [name, setName] = useState('')
  const [cal, setCal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')

  function save() {
    if (!name || !cal) { Alert.alert('Eksik', 'En az isim ve kalori gerekli'); return }
    add.mutate(
      { name, calories_per_100g: Number(cal) || 0, protein_g: Number(p) || 0, carb_g: Number(c) || 0, fat_g: Number(f) || 0 },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Özel Besin</Text>
      <Text variant="label" style={{ marginBottom: spacing.lg }}>Değerler 100 gram başına girilir.</Text>
      <View style={{ gap: spacing.md }}>
        <Input placeholder="Besin adı" value={name} onChangeText={setName} />
        <Input placeholder="Kalori (kcal / 100g)" keyboardType="numeric" value={cal} onChangeText={setCal} />
        <Input placeholder="Protein (g / 100g)" keyboardType="numeric" value={p} onChangeText={setP} />
        <Input placeholder="Karbonhidrat (g / 100g)" keyboardType="numeric" value={c} onChangeText={setC} />
        <Input placeholder="Yağ (g / 100g)" keyboardType="numeric" value={f} onChangeText={setF} />
        <Button title={add.isPending ? 'Kaydediliyor...' : 'Kaydet'} onPress={save} disabled={add.isPending} />
      </View>
    </Screen>
  )
}
