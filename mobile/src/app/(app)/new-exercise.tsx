// mobile/src/app/(app)/new-exercise.tsx
import { useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useExercises, useAddExercise, useUpdateExercise } from '../../lib/queries'
import { MUSCLE_GROUPS, EQUIPMENT, normalizeMuscle, normalizeEquipment, EQUIPMENT_NONE } from '../../lib/exercises'

function ChipSelect({ options, selected, onSelect }: { options: readonly string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
      {options.map((o) => {
        const on = o === selected
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.xl,
              backgroundColor: on ? colors.accent : colors.cardAlt,
              borderWidth: 1,
              borderColor: on ? colors.accent : 'transparent',
            }}
          >
            <Text variant="label" color={on ? colors.accentText : colors.textMuted} style={{ fontWeight: '700' }}>{o}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export default function NewExercise() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { data: exercises } = useExercises()
  const editing = exercises?.find((e) => e.id === id)

  const add = useAddExercise()
  const update = useUpdateExercise()

  const [name, setName] = useState(editing?.name ?? '')
  const [muscle, setMuscle] = useState(editing ? normalizeMuscle(editing.muscle_group) : MUSCLE_GROUPS[0])
  const [equip, setEquip] = useState(editing ? normalizeEquipment(editing.equipment) : EQUIPMENT_NONE)

  const saving = add.isPending || update.isPending
  const equipOptions = [EQUIPMENT_NONE, ...EQUIPMENT] as const

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert('Eksik', 'Egzersiz adı gerekli.')
      return
    }
    const equipment = equip === EQUIPMENT_NONE ? null : equip
    const onDone = {
      onSuccess: () => router.back(),
      onError: (e: unknown) => Alert.alert('Hata', String(e)),
    }
    if (editing) {
      update.mutate({ id: editing.id, name: trimmed, muscle_group: muscle, equipment }, onDone)
    } else {
      add.mutate({ name: trimmed, muscle_group: muscle, equipment }, onDone)
    }
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>{editing ? 'Egzersizi Düzenle' : 'Yeni Egzersiz'}</Text>

      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>AD</Text>
      <Input placeholder="örn. Bench Press" value={name} onChangeText={setName} />

      <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>KAS GRUBU</Text>
      <ChipSelect options={MUSCLE_GROUPS} selected={muscle} onSelect={setMuscle} />

      <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>EKİPMAN</Text>
      <ChipSelect options={equipOptions} selected={equip} onSelect={setEquip} />

      <Button
        icon="checkmark"
        title={saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
        onPress={save}
        disabled={saving}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  )
}
