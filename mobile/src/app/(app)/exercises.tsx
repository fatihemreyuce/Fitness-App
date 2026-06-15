// mobile/src/app/(app)/exercises.tsx
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Input, Button, EmptyState } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useExercisesWithLastWeight } from '../../lib/queries'
import { normalizeMuscle, normalizeEquipment, MUSCLE_GROUPS, MUSCLE_OTHER, EQUIPMENT_NONE } from '../../lib/exercises'
import { ExerciseRow } from '../../components/exercises/ExerciseRow'
import { MuscleFilter } from '../../components/exercises/MuscleFilter'

const ALL = 'Tümü'

export default function Exercises() {
  const { data, isLoading } = useExercisesWithLastWeight()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState(ALL)

  const exercises = data?.exercises ?? []
  const lastWeight = data?.lastWeight ?? {}

  // Veride mevcut kanonik gruplar (MUSCLE_GROUPS sırasında) + 'Diğer' varsa sona; başta 'Tümü'.
  const groups = useMemo(() => {
    const present = new Set(exercises.map((e) => normalizeMuscle(e.muscle_group)))
    const ordered = MUSCLE_GROUPS.filter((g) => present.has(g))
    const tail = present.has(MUSCLE_OTHER) ? [MUSCLE_OTHER] : []
    return [ALL, ...ordered, ...tail]
  }, [exercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return exercises.filter((e) => {
      const matchSearch = !q || e.name.toLocaleLowerCase('tr-TR').includes(q)
      const matchMuscle = muscle === ALL || normalizeMuscle(e.muscle_group) === muscle
      return matchSearch && matchMuscle
    })
  }, [exercises, search, muscle])

  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text variant="title">Egzersizler</Text>
        <Button icon="add" title="Egzersiz" onPress={() => router.push('/(app)/new-exercise')} style={{ paddingVertical: 9, paddingHorizontal: spacing.md }} />
      </View>

      <Input placeholder="Egzersiz ara…" value={search} onChangeText={setSearch} autoCapitalize="none" />

      <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
        <MuscleFilter groups={groups} selected={muscle} onSelect={setMuscle} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState icon="barbell-outline" label="Egzersiz bulunamadı" hint="Aramayı temizle ya da yeni egzersiz ekle." />
        }
        renderItem={({ item }) => {
          const eq = normalizeEquipment(item.equipment)
          const subtitle = eq === EQUIPMENT_NONE ? normalizeMuscle(item.muscle_group) : `${normalizeMuscle(item.muscle_group)} · ${eq}`
          return (
            <ExerciseRow
              name={item.name}
              subtitle={subtitle}
              lastWeight={item.id in lastWeight ? lastWeight[item.id] : null}
              isCustom={item.owner_id != null}
              onPress={() => router.push(`/(app)/exercise/${item.id}`)}
            />
          )
        }}
      />
    </Screen>
  )
}
