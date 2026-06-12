import { useEffect, useRef, useState } from 'react'
import { Animated, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'
import { useGoals, useUpdateGoals } from '../../lib/queries'

function GoalRow({ label, suffix, value, onChange, onCommit, focused, setFocused, last }: {
  label: string; suffix: string; value: string; onChange: (s: string) => void; onCommit: () => void
  focused: boolean; setFocused: (b: boolean) => void; last?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <Text variant="body">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1.5, borderBottomColor: focused ? colors.accent : 'transparent', paddingBottom: 2 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onCommit() }}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={colors.textFaint}
          style={{ color: colors.text, fontSize: 15, fontWeight: '700', minWidth: 48, textAlign: 'right', padding: 0 }}
        />
        <Text color={colors.textFaint} variant="label">{suffix}</Text>
      </View>
    </View>
  )
}

export function GoalsInline() {
  const { data: goals } = useGoals()
  const update = useUpdateGoals()
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')
  const [calF, setCalF] = useState(false)
  const [protF, setProtF] = useState(false)
  const tick = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (goals) { setCal(goals.daily_calorie_goal?.toString() ?? ''); setProt(goals.daily_protein_goal?.toString() ?? '') }
  }, [goals])

  function flashTick() {
    tick.setValue(0)
    Animated.sequence([
      Animated.timing(tick, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(tick, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }

  function commit() {
    const c = cal.trim() ? Number(cal) : null
    const p = prot.trim() ? Number(prot) : null
    if ((c !== null && (!Number.isFinite(c) || c <= 0)) || (p !== null && (!Number.isFinite(p) || p <= 0))) return
    if (c === (goals?.daily_calorie_goal ?? null) && p === (goals?.daily_protein_goal ?? null)) return
    update.mutate({ daily_calorie_goal: c, daily_protein_goal: p }, { onSuccess: flashTick })
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Text variant="eyebrow">Günlük Hedefler</Text>
        <Animated.View style={{ opacity: tick, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="checkmark" size={13} color={colors.accent} />
          <Text variant="label" color={colors.accent}>kaydedildi</Text>
        </Animated.View>
      </View>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md }}>
        <GoalRow label="Kalori" suffix="kcal" value={cal} onChange={setCal} onCommit={commit} focused={calF} setFocused={setCalF} />
        <GoalRow label="Protein" suffix="g" value={prot} onChange={setProt} onCommit={commit} focused={protF} setFocused={setProtF} last />
      </View>
    </View>
  )
}
