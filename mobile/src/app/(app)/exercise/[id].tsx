// mobile/src/app/(app)/exercise/[id].tsx
import { useMemo } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Card, StatChip, Button, EmptyState, Hairline } from '../../../components/ui'
import { colors, spacing } from '../../../theme'
import { useExercises, useExerciseHistory, useDeleteExercise } from '../../../lib/queries'
import {
  normalizeMuscle,
  normalizeEquipment,
  groupBySession,
  personalRecord,
  estimate1RM,
  trendPoints,
  daysSince,
  EQUIPMENT_NONE,
} from '../../../lib/exercises'
import { WeightLineChart } from '../../../components/charts/WeightLineChart'
import { ExerciseHistoryList } from '../../../components/exercises/ExerciseHistoryList'
import { DetailSkeleton } from '../../../components/skeletons/DetailSkeleton'

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: exercises } = useExercises()
  const { data: history, isLoading } = useExerciseHistory(id ?? '')
  const del = useDeleteExercise()

  const exercise = exercises?.find((e) => e.id === id)

  const sessions = useMemo(() => groupBySession(history ?? []), [history])
  const pr = useMemo(() => personalRecord(history ?? []), [history])
  const orm = useMemo(() => estimate1RM(history ?? []), [history])
  const points = useMemo(() => trendPoints(sessions), [sessions])
  const lastDays = sessions.length > 0 ? daysSince(`${sessions[0].date}T00:00:00`, Date.now()) : null

  function onDelete() {
    if (!exercise) return
    Alert.alert('Egzersizi sil', `"${exercise.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          del.mutate(exercise.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Hata', String(e)),
          }),
      },
    ])
  }

  if (!exercise) {
    if (isLoading) return <DetailSkeleton />
    return (
      <Screen>
        <Text color={colors.textMuted}>Egzersiz bulunamadı.</Text>
      </Screen>
    )
  }

  const eq = normalizeEquipment(exercise.equipment)
  const subtitle = eq === EQUIPMENT_NONE ? normalizeMuscle(exercise.muscle_group) : `${normalizeMuscle(exercise.muscle_group)} · ${eq}`
  const isCustom = exercise.owner_id != null
  const hasHistory = sessions.length > 0

  return (
    <Screen scroll>
      <Text variant="eyebrow">EGZERSİZ</Text>
      <Text variant="title">{exercise.name}</Text>
      <Text variant="label" style={{ marginTop: 2, marginBottom: spacing.lg }}>{subtitle}</Text>

      {hasHistory ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatChip label="REKOR" value={`${pr} kg`} color={colors.accent} />
            <StatChip label="TAHMİNİ 1RM" value={`${orm} kg`} />
            <StatChip label="SON" value={lastDays === 0 ? 'bugün' : `${lastDays}g`} />
          </View>

          <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>AĞIRLIK TRENDİ</Text>
          <Card>
            <WeightLineChart points={points} />
          </Card>

          <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>GEÇMİŞ</Text>
          <ExerciseHistoryList sessions={sessions} />
        </>
      ) : (
        <EmptyState
          icon="barbell-outline"
          label="Henüz bu egzersizle antrenman yok"
          hint="Bir antrenmana ekleyip set kaydettiğinde geçmiş ve rekorların burada görünür."
        />
      )}

      {isCustom ? (
        <View style={{ marginTop: spacing.xl }}>
          <Hairline />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button icon="create-outline" title="Düzenle" variant="ghost" onPress={() => router.push(`/(app)/new-exercise?id=${exercise.id}`)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button icon="trash-outline" title="Sil" variant="ghost" onPress={onDelete} disabled={del.isPending} />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  )
}
