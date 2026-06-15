// mobile/src/components/auth/AuthBackground.tsx
import { type ReactNode } from 'react'
import { ImageBackground, KeyboardAvoidingView, Platform, View, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { LinearGradient } from 'expo-linear-gradient'

const HERO = require('../../../assets/images/auth-hero.jpg')
const LOGO = require('../../../assets/images/logo-glow.png')

export function AuthBackground({ children, showTagline = false }: { children: ReactNode; showTagline?: boolean }) {
  return (
    <ImageBackground source={HERO} style={{ flex: 1, backgroundColor: colors.bg }} resizeMode="cover">
      {/* alt kararma — form/metin okunabilirliği (gerçek gradient, banding yok) */}
      <LinearGradient
        colors={['transparent', colors.bg]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 460 }}
        pointerEvents="none"
      />
      {/* üst kararma — marka kontrastı */}
      <LinearGradient
        colors={['rgba(13,15,18,0.6)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 240 }}
        pointerEvents="none"
      />

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
