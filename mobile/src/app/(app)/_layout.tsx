import { Tabs } from 'expo-router'
import { colors } from '../../theme'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Antrenmanlar' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Egzersizler' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Beslenme' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      <Tabs.Screen name="new-workout" options={{ href: null, title: 'Yeni Antrenman' }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Detay' }} />
      <Tabs.Screen name="add-food" options={{ href: null, title: 'Besin Ekle' }} />
      <Tabs.Screen name="new-food" options={{ href: null, title: 'Özel Besin' }} />
    </Tabs>
  )
}
