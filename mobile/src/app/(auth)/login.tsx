// mobile/src/app/(auth)/login.tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthBackground } from '../../components/auth/AuthBackground'
import { AuthField } from '../../components/auth/AuthField'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'
import { Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Giriş hatası', error.message)
  }

  return (
    <AuthBackground>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Giriş Yap</Text>
      <View style={{ gap: spacing.md }}>
        <AuthField icon="mail-outline" placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AuthField icon="lock-closed-outline" placeholder="Şifre" secure value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} loading={loading} disabled={loading} />
        <GoogleAuthButton />
      </View>
      <Link href="/(auth)/signup" style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Hesabın yok mu? Kayıt ol</Text>
      </Link>
    </AuthBackground>
  )
}
