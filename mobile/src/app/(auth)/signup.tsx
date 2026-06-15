// mobile/src/app/(auth)/signup.tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthBackground } from '../../components/auth/AuthBackground'
import { AuthField } from '../../components/auth/AuthField'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'
import { Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) Alert.alert('Kayıt hatası', error.message)
    // E-posta onayı açıksa signUp session DÖNDÜRMEZ → kullanıcı önce doğrulamalı.
    else if (!data.session) Alert.alert('E-postanı doğrula', 'Hesabın oluşturuldu. Giriş yapmadan önce e-postana gönderilen doğrulama bağlantısına tıkla.')
    else Alert.alert('Başarılı', 'Hesap oluşturuldu.')
  }

  return (
    <AuthBackground>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Kayıt Ol</Text>
      <View style={{ gap: spacing.md }}>
        <AuthField icon="mail-outline" placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AuthField icon="lock-closed-outline" placeholder="Şifre (en az 6 karakter)" secure value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} loading={loading} disabled={loading} />
        <GoogleAuthButton />
      </View>
      <Link href="/(auth)/login" style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten hesabın var mı? Giriş yap</Text>
      </Link>
    </AuthBackground>
  )
}
