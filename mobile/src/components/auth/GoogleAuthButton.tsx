// mobile/src/components/auth/GoogleAuthButton.tsx
import { useState } from 'react'
import { Alert, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius } from '../../theme'
import { signInWithGoogle } from '../../lib/googleAuth'

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false)

  async function onPress() {
    setLoading(true)
    const result = await signInWithGoogle()
    setLoading(false)
    if (result.status === 'error') Alert.alert('Giriş hatası', result.message)
    // success → onAuthStateChange yönlendirir; cancelled → sessiz
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          borderRadius: radius.md,
          paddingVertical: 13,
        },
        (pressed || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={17} color={colors.text} />
          <Text variant="body" color={colors.text} style={{ fontWeight: '700' }}>Google ile devam et</Text>
        </>
      )}
    </Pressable>
  )
}
