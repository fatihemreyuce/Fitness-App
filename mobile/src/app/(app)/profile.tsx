import { useEffect, useState } from 'react'
import { Button, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

export default function Profile() {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => setDisplayName(data?.display_name ?? null))
  }, [session])

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Profil</Text>
      <Text>Ad: {displayName ?? '...'}</Text>
      <Text>E-posta: {session?.user.email}</Text>
      <Button title="Çıkış Yap" onPress={() => supabase.auth.signOut()} />
    </View>
  )
}
