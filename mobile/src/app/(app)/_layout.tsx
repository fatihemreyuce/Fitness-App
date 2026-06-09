import { Tabs } from 'expo-router'

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Antrenmanlar' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Egzersizler' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      {/* Stack ekranları sekmede gizli */}
      <Tabs.Screen name="new-workout" options={{ href: null, title: 'Yeni Antrenman' }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Detay' }} />
    </Tabs>
  )
}
