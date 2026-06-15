// mobile/src/app/(auth)/welcome.tsx
import { View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { AuthBackground } from '../../components/auth/AuthBackground'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'
import { Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

export default function Welcome() {
  const router = useRouter()
  return (
    <AuthBackground showTagline>
      <Text variant="title" style={{ fontSize: 34, fontWeight: '900', marginBottom: spacing.lg }}>Formda kal.</Text>
      <View style={{ gap: spacing.sm }}>
        <Button title="Başla" onPress={() => router.push('/(auth)/signup')} />
        <GoogleAuthButton />
      </View>
      <Link href="/(auth)/login" style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten üye misin? Giriş yap</Text>
      </Link>
    </AuthBackground>
  )
}
