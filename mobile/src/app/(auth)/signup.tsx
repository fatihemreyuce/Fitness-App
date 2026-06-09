import { useState } from 'react'
import { Alert, Button, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) Alert.alert('Kayıt hatası', error.message)
    else Alert.alert('Başarılı', 'Hesap oluşturuldu. Giriş yapabilirsin.')
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 12 }}>Kayıt Ol</Text>
      <TextInput
        placeholder="E-posta" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} disabled={loading} />
      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Zaten hesabın var mı? Giriş yap
      </Link>
    </View>
  )
}
