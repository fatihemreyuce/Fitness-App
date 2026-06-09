import { useState } from 'react'
import { Alert, Button, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

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
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 12 }}>Giriş Yap</Text>
      <TextInput
        placeholder="E-posta" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} disabled={loading} />
      {/* Google ile giriş butonu Bölüm 3'te (OAuth yapılandırıldıktan sonra) eklenecek */}
      <Link href="/(auth)/signup" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Hesabın yok mu? Kayıt ol
      </Link>
    </View>
  )
}
