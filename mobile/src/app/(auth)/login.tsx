import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Screen, Text, Input, Button } from '../../components/ui'
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
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
        <Text variant="title" style={{ marginBottom: spacing.sm }}>Giriş Yap</Text>
        <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} disabled={loading} />
        <Link href="/(auth)/signup" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Hesabın yok mu? Kayıt ol</Text>
        </Link>
      </View>
    </Screen>
  )
}
