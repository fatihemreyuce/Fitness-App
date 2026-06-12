import { Pressable, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Text, Hairline } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useDisplayName } from '../../lib/queries'
import { ProgressHero } from '../../components/profile/ProgressHero'
import { KpiStrip } from '../../components/profile/KpiStrip'
import { WeightTrend } from '../../components/profile/WeightTrend'
import { GoalsInline } from '../../components/profile/GoalsInline'
import { StatsSection } from '../../components/StatsSection'
import { DeleteAccountSection } from '../../components/DeleteAccountSection'

export default function Profile() {
  const { session } = useAuth()
  const { data: displayName } = useDisplayName()
  const initial = (displayName ?? session?.user.email ?? '?').trim().charAt(0).toUpperCase()

  return (
    <Screen scroll>
      {/* Kimlik şeridi */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accent }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{displayName ?? '...'}</Text>
          <Text variant="label">{session?.user.email}</Text>
        </View>
      </View>

      <Hairline />
      <ProgressHero />
      <Hairline />
      <KpiStrip />
      <Hairline />
      <WeightTrend />
      <Hairline />
      <GoalsInline />
      <Hairline />
      <StatsSection />
      <Hairline />

      {/* Hesap */}
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Hesap</Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md }}>
        <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }, pressed && { opacity: 0.7 }]}>
          <Text variant="body" color={colors.textMuted}>↩  Çıkış yap</Text>
        </Pressable>
      </View>

      <DeleteAccountSection />
    </Screen>
  )
}
