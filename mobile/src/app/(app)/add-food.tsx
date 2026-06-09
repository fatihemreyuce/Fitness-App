import { useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'
import { useLocalSearchParams, useRouter, Link } from 'expo-router'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useFoods, useAddFoodEntry, type Food, type MealType } from '../../lib/queries'

export default function AddFood() {
  const { meal, date } = useLocalSearchParams<{ meal: MealType; date: string }>()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: foods, isLoading } = useFoods(search)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('100')
  const addEntry = useAddFoodEntry()

  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const ratio = (Number(qty) || 0) / 100
  function save() {
    if (!selected) return
    const q = Number(qty)
    if (!q || q <= 0) { Alert.alert('Geçersiz', 'Miktar 0’dan büyük olmalı'); return }
    if (!MEAL_TYPES.includes(meal) || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
      Alert.alert('Hata', 'Geçersiz öğün veya tarih'); return
    }
    addEntry.mutate(
      { entry_date: date, meal_type: meal, food_id: selected.id, quantity_g: q },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen>
      <Input placeholder="Besin ara (örn. tavuk)" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <Link href="/(app)/new-food" style={{ marginTop: spacing.sm }}>
        <Text variant="label" color={colors.accent}>+ Listede yok mu? Özel besin oluştur</Text>
      </Link>

      <FlatList
        style={{ marginTop: spacing.md, flexGrow: 0, maxHeight: 320 }}
        data={foods}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text variant="label">{isLoading ? 'Aranıyor...' : 'Sonuç yok'}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)}>
            <Card style={{ padding: spacing.md, marginBottom: spacing.sm, borderColor: selected?.id === item.id ? colors.accent : colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
                <Text variant="body" color={colors.accent}>{Math.round(item.calories_per_100g)}</Text>
              </View>
              <Text variant="label">100g · P {item.protein_g} · K {item.carb_g} · Y {item.fat_g}</Text>
            </Card>
          </Pressable>
        )}
      />

      {selected && (
        <Card style={{ marginTop: spacing.md }}>
          <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>{selected.name} · miktar (g)</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Input keyboardType="numeric" value={qty} onChangeText={setQty} style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }} />
            <Text variant="label">
              = {Math.round(selected.calories_per_100g * ratio)} kcal{'\n'}P {Math.round(selected.protein_g * ratio)}g
            </Text>
          </View>
          <Button title={addEntry.isPending ? 'Ekleniyor...' : 'Öğüne Ekle'} onPress={save} disabled={addEntry.isPending} style={{ marginTop: spacing.md }} />
        </Card>
      )}
    </Screen>
  )
}
