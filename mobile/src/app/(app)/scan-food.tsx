// mobile/src/app/(app)/scan-food.tsx
import { useState } from 'react'
import { View, Pressable, Image, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Screen, Text, Card, Button, ProgressBar } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useAnalyzeFood, useLogScannedFood, type AnalyzeFoodResult } from '../../lib/queries'
import { FoodConfirmCard, type FoodConfirmArgs } from '../../components/nutrition/FoodConfirmCard'
import { todayISO } from '../../lib/stats'

type Phase = 'idle' | 'loading' | 'result' | 'error'

export default function ScanFood() {
  const { date } = useLocalSearchParams<{ date?: string }>()
  const entryDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? (date as string) : todayISO()
  const router = useRouter()
  const analyze = useAnalyzeFood()
  const logFood = useLogScannedFood()

  const [phase, setPhase] = useState<Phase>('idle')
  const [thumb, setThumb] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeFoodResult | null>(null)
  const [errMsg, setErrMsg] = useState('')

  async function pick(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Ayarlardan kamera/galeri iznini açman gerekiyor.')
      return
    }
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] })
    if (picked.canceled || !picked.assets[0]) return

    const uri = picked.assets[0].uri
    setThumb(uri)
    setPhase('loading')

    try {
      // SDK 54: yeni context-tabanlı ImageManipulator API (manipulateAsync deprecated).
      const rendered = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync()
      const manip = await rendered.saveAsync({
        compress: 0.5,
        format: SaveFormat.JPEG,
        base64: true,
      })
      if (!manip.base64) throw new Error('Görsel işlenemedi')
      const res = await analyze.mutateAsync({ imageBase64: manip.base64, mimeType: 'image/jpeg' })
      if (res.yemek_adi == null) {
        setErrMsg('Görselde yemek bulunamadı. Daha net bir fotoğraf dene.')
        setPhase('error')
        return
      }
      setResult(res)
      setPhase('result')
    } catch {
      setErrMsg('Analiz başarısız oldu. Bağlantını kontrol edip tekrar dene.')
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setResult(null)
    setThumb(null)
    setErrMsg('')
  }

  function confirm(args: FoodConfirmArgs) {
    logFood.mutate(
      { ...args, entry_date: entryDate },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Hata', String(e)),
      },
    )
  }

  return (
    <Screen scroll>
      <Text variant="eyebrow">AI İLE YEMEK TARA</Text>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>
        Yemeğini Tara
      </Text>

      {phase === 'idle' && (
        <>
          <Card style={{ borderStyle: 'dashed', alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="scan-outline" size={44} color={colors.textFaint} />
            <Text variant="subtitle" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Yemeğini ortala ve çek
            </Text>
            <Text variant="label" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              Tek yemek, iyi ışık — daha doğru sonuç
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs }}>
              <Ionicons name="pricetag-outline" size={12} color={colors.accent} />
              <Text variant="label" color={colors.accent}>
                Paketli üründe arkadaki besin tablosunu çek
              </Text>
            </View>
          </Card>
          <Button
            icon="camera"
            title="Fotoğraf Çek"
            onPress={() => pick('camera')}
            style={{ marginTop: spacing.md }}
          />
          <Button
            icon="image"
            title="Galeriden Seç"
            variant="ghost"
            onPress={() => pick('library')}
            style={{ marginTop: spacing.sm }}
          />
        </>
      )}

      {phase === 'loading' && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          {thumb && (
            <Image
              source={{ uri: thumb }}
              style={{ width: 120, height: 120, borderRadius: 12, opacity: 0.5, marginBottom: spacing.md }}
            />
          )}
          <ActivityIndicator color={colors.accent} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
            <Text variant="label">Yapay zekâ analiz ediyor…</Text>
          </View>
          <View style={{ width: '100%', marginTop: spacing.md }}>
            <ProgressBar value={0.6} />
          </View>
        </Card>
      )}

      {phase === 'result' && result && result.yemek_adi != null && (
        <FoodConfirmCard
          result={{ ...result, yemek_adi: result.yemek_adi }}
          isSaving={logFood.isPending}
          onConfirm={confirm}
          onRetry={reset}
        />
      )}

      {phase === 'error' && (
        <>
          <Card style={{ borderStyle: 'dashed', alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.textFaint} />
            <Text variant="subtitle" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Yemek bulunamadı
            </Text>
            <Text variant="label" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              {errMsg}
            </Text>
          </Card>
          <Button icon="refresh" title="Tekrar Dene" onPress={reset} style={{ marginTop: spacing.md }} />
          <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <Text variant="label" color={colors.textMuted}>
              Vazgeç
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  )
}
