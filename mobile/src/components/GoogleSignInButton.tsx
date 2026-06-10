import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Button, Text } from './ui'
import { signInWithGoogle } from '../lib/googleAuth'
import { colors, spacing } from '../theme'

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)

  async function onPress() {
    setLoading(true)
    const result = await signInWithGoogle()
    setLoading(false)
    if (result.status === 'error') {
      Alert.alert('Giriş hatası', result.message)
    }
    // success → onAuthStateChange yönlendirir; cancelled → sessizce geç
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="label" color={colors.textMuted}>veya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <Button
        title="Google ile devam et"
        icon="logo-google"
        variant="ghost"
        onPress={onPress}
        loading={loading}
      />
    </View>
  )
}
