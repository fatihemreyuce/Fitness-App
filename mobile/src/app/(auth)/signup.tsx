import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Screen, Text, Input, Button } from '../../components/ui'
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
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
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
        <Text variant="title" style={{ marginBottom: spacing.sm }}>Kayıt Ol</Text>
        <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} disabled={loading} />
        <GoogleSignInButton />
        <Link href="/(auth)/login" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten hesabın var mı? Giriş yap</Text>
        </Link>
      </View>
    </Screen>
  )
}
