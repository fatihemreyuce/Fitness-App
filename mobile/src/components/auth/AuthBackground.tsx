// mobile/src/components/auth/AuthBackground.tsx
import { type ReactNode } from 'react'
import { ImageBackground, KeyboardAvoidingView, Platform, View, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { FadeOverlay } from './FadeOverlay'

const HERO = require('../../../assets/images/auth-hero.jpg')
const LOGO = require('../../../assets/images/logo-glow.png')

export function AuthBackground({ children, showTagline = false }: { children: ReactNode; showTagline?: boolean }) {
  return (
    <ImageBackground source={HERO} style={{ flex: 1, backgroundColor: colors.bg }} resizeMode="cover">
      {/* alt kararma — form/metin okunabilirliği */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <FadeOverlay height={460} from={0} to={1} />
      </View>
      {/* üst kararma — marka kontrastı (yumuşak gradient, sert kenar yok) */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }} pointerEvents="none">
        <FadeOverlay height={240} from={0.6} to={0} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1, paddingHorizontal: spacing.lg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Image source={LOGO} style={{ width: 56, height: 56, borderRadius: 16 }} resizeMode="contain" />
            <Text variant="title" style={{ marginTop: spacing.sm }}>FitLens</Text>
            {showTagline ? (
              <Text variant="label" color="#d7dce3" style={{ marginTop: 2 }}>
                Antrenman & beslenme, tek yerde
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.xl }}>{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}
