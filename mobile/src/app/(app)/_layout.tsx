import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme'

type IconName = keyof typeof Ionicons.glyphMap

function tabIcon(focused: IconName, unfocused: IconName) {
  return ({ color, size, focused: isFocused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={isFocused ? focused : unfocused} size={size} color={color} />
  )
}

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
      <Tabs.Screen name="index" options={{ title: 'Antrenmanlar', tabBarIcon: tabIcon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="exercises" options={{ title: 'Egzersizler', tabBarIcon: tabIcon('list', 'list-outline') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Beslenme', tabBarIcon: tabIcon('nutrition', 'nutrition-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }} />
      <Tabs.Screen name="new-workout" options={{ href: null, title: 'Yeni Antrenman' }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Detay' }} />
      <Tabs.Screen name="add-food" options={{ href: null, title: 'Besin Ekle' }} />
      <Tabs.Screen name="new-food" options={{ href: null, title: 'Özel Besin' }} />
    </Tabs>
  )
}
