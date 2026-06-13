# FitLens — AI ile Yemek Tara Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı yemek fotoğrafı çeker/seçer → Gemini 2.0-flash analiz eder → "Tek Kart" (Direction A) onay kartında öğün seçilip onaylanır → kayıt mevcut `foods`+`food_entries` sistemine düşer, Stats/hedef otomatik görür.

**Architecture:** İki parça, **yeni DB tablosu yok, Storage yok**. (1) Deno Edge Function `yemek-analiz-et` güvenli Gemini proxy'si (base64 alır, JSON döner). (2) RN `scan-food` ekranı: expo-image-picker ile çek/seç → expo-image-manipulator ile ~80KB'a sıkıştır + base64 → Edge Function invoke → tek Card'da idle/loading/result/error state'leri → onayda food+entry yazımı.

**Tech Stack:** Expo SDK 54, React 19, expo-router, @tanstack/react-query 5, Supabase JS, Supabase Edge Functions (Deno), Gemini 2.0-flash REST, expo-image-picker, expo-image-manipulator.

**Design ref:** `docs/superpowers/specs/2026-06-13-fitlens-food-scan-design.md` (UI = Direction A "Tek Kart").

**Test notu:** Projede test runner yok. Doğrulama kapısı `npx tsc --noEmit` + cihaz doğrulaması (yeni APK build sonrası). Saf helper (`portionToPer100g`) izole, React/Supabase'siz, manuel akıl-yürütme örnekleriyle.

---

## Agent Split (paralel execution)

Dosyalar çakışmıyor → 3 iş kolu paralel:
- **Agent A — Edge Function:** Task 2. (`supabase/functions/yemek-analiz-et/`)
- **Agent B — RN UI:** Task 5, 6. (`FoodConfirmCard.tsx`, `scan-food.tsx`)
- **Agent C — Veri + entegrasyon:** Task 1, 3, 4, 7. (`foodScan.ts`, `queries.ts`, deps, `nutrition.tsx`)

Interface bu planda kilitli → B, C'nin hook imzalarına göre kodlar. Agent'lar **commit ETMEZ**; orchestrator entegrasyonda tek `tsc` + tek commit yapar.

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/src/lib/foodScan.ts` | saf `ScanResult`/`Per100g` tipi + `portionToPer100g` | Create |
| `supabase/functions/yemek-analiz-et/index.ts` | Gemini 2.0-flash proxy (base64→JSON) | Create |
| `mobile/src/lib/queries.ts` | `AnalyzeFoodResult` + `useAnalyzeFood` + `useLogScannedFood` | Modify (sona ekle) |
| `mobile/src/components/nutrition/FoodConfirmCard.tsx` | onay kartı (Direction A) | Create |
| `mobile/src/app/(app)/scan-food.tsx` | tara ekranı (idle/loading/result/error) | Create |
| `mobile/src/app/(app)/nutrition.tsx` | "📷 AI ile Tara" giriş butonu | Modify |
| `mobile/package.json` | expo-image-picker + expo-image-manipulator | Modify (expo install) |

---

### Task 1: Saf dönüşüm helper'ı `foodScan.ts` (Agent C)

**Files:**
- Create: `mobile/src/lib/foodScan.ts`

- [ ] **Step 1: Helper + tipleri yaz**

Gemini porsiyon-başına döner; `foods` tablosu 100g-başına saklar. Bu helper dönüşümü yapar. `porsiyon_gram <= 0` ise 1'e sabitlenir (bölme guard).

```ts
// mobile/src/lib/foodScan.ts
// Edge Function 'yemek-analiz-et' yanıt şekli (porsiyon başına değerler).
export type ScanResult = {
  yemek_adi: string | null
  porsiyon_gram: number
  kalori: number
  protein: number
  karbonhidrat: number
  yag: number
}

// foods tablosunun 100g-başına şeması.
export type Per100g = {
  calories_per_100g: number
  protein_g: number
  carb_g: number
  fat_g: number
}

// Porsiyon-başına makroları 100g-başına çevirir. Negatif/0 porsiyon guard'lı.
export function portionToPer100g(r: {
  kalori: number; protein: number; karbonhidrat: number; yag: number; porsiyon_gram: number
}): Per100g {
  const g = r.porsiyon_gram > 0 ? r.porsiyon_gram : 1
  const k = 100 / g
  return {
    calories_per_100g: Math.max(0, Math.round(r.kalori * k)),
    protein_g: Math.max(0, Math.round(r.protein * k)),
    carb_g: Math.max(0, Math.round(r.karbonhidrat * k)),
    fat_g: Math.max(0, Math.round(r.yag * k)),
  }
}
```

**Manuel akıl-yürütme (doğrulama):**
- porsiyon_gram=120, kalori=180 → k=100/120=0.8333 → calories_per_100g=round(180×0.8333)=150. Entry quantity_g=120 → gösterilen kcal = 150×120/100 = 180 ✓ (taranan değere eşit).
- porsiyon_gram=0 (bozuk) → g=1, k=100 → çok büyük ama NaN/Infinity değil; client min 1g guard'ı zaten porsiyon'u düzeltir.
- kalori=-5 → Math.max(0, …)=0 ✓.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (yeni dosya tipli, kullanılmıyor henüz — sorun değil).

---

### Task 2: Edge Function `yemek-analiz-et` (Agent A)

**Files:**
- Create: `supabase/functions/yemek-analiz-et/index.ts`

- [ ] **Step 1: Edge Function'ı yaz**

Deno runtime. base64 + mimeType alır, Gemini 2.0-flash'a `responseMimeType: application/json` ile gönderir (markdown sorununu baştan keser), savunmacı parse eder. DB/Storage'a dokunmaz. `GEMINI_API_KEY` secret'tan.

```ts
// supabase/functions/yemek-analiz-et/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PROMPT =
  "Bu görseldeki yemeği analiz et. Tahmini porsiyonu gram cinsinden ver ve o porsiyonun " +
  "TOPLAM kalori ve makrolarını hesapla. SADECE şu alanlara sahip bir JSON döndür: " +
  "yemek_adi (string), porsiyon_gram (number), kalori (number), protein (number), " +
  "karbonhidrat (number), yag (number). Görselde tanınır bir yemek yoksa yemek_adi alanını null yap."

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { imageBase64, mimeType } = await req.json().catch(() => ({}))
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 gerekli" }, 400)
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) return json({ error: "GEMINI_API_KEY tanımlı değil" }, 500)

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType ?? "image/jpeg", data: imageBase64 } },
              { text: PROMPT },
            ],
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    )
    if (!gemRes.ok) {
      console.error("Gemini error", gemRes.status, await gemRes.text())
      return json({ error: "AI servisi hatası" }, 502)
    }
    const data = await gemRes.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return json({ error: "AI boş yanıt" }, 502)

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(stripFence(text))
    } catch {
      console.error("JSON parse fail:", text)
      return json({ error: "AI yanıtı çözümlenemedi" }, 502)
    }
    if (parsed?.yemek_adi == null) return json({ yemek_adi: null }, 200)

    return json({
      yemek_adi: String(parsed.yemek_adi),
      porsiyon_gram: num(parsed.porsiyon_gram, 100),
      kalori: num(parsed.kalori, 0),
      protein: num(parsed.protein, 0),
      karbonhidrat: num(parsed.karbonhidrat, 0),
      yag: num(parsed.yag, 0),
    }, 200)
  } catch (e) {
    console.error("Unexpected", e)
    return json({ error: "Beklenmeyen hata" }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  })
}
function num(v: unknown, d: number) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}
function stripFence(s: string) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
}
```

- [ ] **Step 2: Deploy + secret (KULLANICI çalıştırır — Supabase login + Gemini key gerekir)**

Run:
```bash
cd "C:/Users/fatih/fitness-app"
npx supabase secrets set GEMINI_API_KEY=<SENIN_GEMINI_ANAHTARIN>
npx supabase functions deploy yemek-analiz-et
```
Expected: "Deployed Function yemek-analiz-et". (Secret zaten varsa set adımı tekrar gerekmez.)

> Not: `config.toml`'da `verify_jwt` varsayılan açık — invoke kullanıcının JWT'siyle gelir, sorun yok. Eğer deploy sırasında JWT doğrulamasını kapatmak istersen `--no-verify-jwt` ekleme; varsayılan kalsın (güvenli).

---

### Task 3: queries.ts hook'ları (Agent C)

**Files:**
- Modify: `mobile/src/lib/queries.ts` (dosyanın sonuna ekle)

- [ ] **Step 1: `useDeleteFoodEntry`'den sonra hook'ları ekle**

`requireUserId`, `useMutation`, `useQueryClient`, `supabase`, `Food`, `MealType` zaten bu dosyada mevcut/import'lu.

```ts
// === AI Yemek Tarama ===
export type AnalyzeFoodResult = {
  yemek_adi: string | null
  porsiyon_gram: number
  kalori: number
  protein: number
  karbonhidrat: number
  yag: number
}

// Edge Function'ı çağırır; base64 görseli analiz ettirir.
export function useAnalyzeFood() {
  return useMutation({
    mutationFn: async (input: { imageBase64: string; mimeType: string }): Promise<AnalyzeFoodResult> => {
      const { data, error } = await supabase.functions.invoke('yemek-analiz-et', { body: input })
      if (error) throw error
      return data as AnalyzeFoodResult
    },
  })
}

// Taranan yemeği mevcut sisteme yazar: foods (100g-başına) + food_entries (porsiyon).
export function useLogScannedFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      per100g: { calories_per_100g: number; protein_g: number; carb_g: number; fat_g: number }
      quantity_g: number
      meal_type: MealType
      entry_date: string
    }) => {
      const userId = await requireUserId()
      const { data: food, error: fErr } = await supabase.from('foods')
        .insert({ name: input.name, ...input.per100g, owner_id: userId })
        .select().single()
      if (fErr) throw fErr
      const { error: eErr } = await supabase.from('food_entries').insert({
        user_id: userId,
        entry_date: input.entry_date,
        meal_type: input.meal_type,
        food_id: (food as Food).id,
        quantity_g: input.quantity_g,
      })
      if (eErr) throw eErr
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['food_entries', vars.entry_date] })
      qc.invalidateQueries({ queryKey: ['foods'] })
    },
  })
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 4: Native bağımlılıklar (Agent C)

**Files:**
- Modify: `mobile/package.json` (expo install otomatik)

- [ ] **Step 1: SDK-uyumlu sürümleri kur**

`npx expo install` Expo SDK 54 ile uyumlu sürümleri seçer (sürüm sabitlemeyiz).

Run:
```bash
cd "C:/Users/fatih/fitness-app/mobile"
npx expo install expo-image-picker expo-image-manipulator
```
Expected: package.json'a iki paket eklenir, lockfile güncellenir.

- [ ] **Step 2: doctor kontrolü**

Run: `cd mobile && npx expo-doctor`
Expected: sürüm uyumsuzluğu uyarısı yok.

---

### Task 5: `FoodConfirmCard.tsx` — onay kartı (Agent B)

**Files:**
- Create: `mobile/src/components/nutrition/FoodConfirmCard.tsx`

- [ ] **Step 1: Kartı yaz (Direction A — Tek Kart)**

Props: analiz sonucu (yemek_adi null değil), düzenlenebilir porsiyon, 4 öğün chip'i, StatChip makro sırası, onayla/yeniden butonları. Makrolar **anlık porsiyona göre** yeniden hesaplanır. Onayda `portionToPer100g` (orijinal değerlerden) + `quantity_g = porsiyon` döner.

```tsx
// mobile/src/components/nutrition/FoodConfirmCard.tsx
import { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Text, Card, Button, Input, StatChip, Hairline } from '../ui'
import { colors, spacing } from '../../theme'
import { portionToPer100g, type ScanResult } from '../../lib/foodScan'
import type { MealType } from '../../lib/queries'

const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Kahvaltı' },
  { type: 'lunch', label: 'Öğle' },
  { type: 'dinner', label: 'Akşam' },
  { type: 'snack', label: 'Atış.' },
]

type Props = {
  result: ScanResult & { yemek_adi: string }   // null-olmayan
  isSaving: boolean
  onConfirm: (args: {
    name: string
    per100g: ReturnType<typeof portionToPer100g>
    quantity_g: number
    meal_type: MealType
  }) => void
  onRetry: () => void
}

export function FoodConfirmCard({ result, isSaving, onConfirm, onRetry }: Props) {
  const [portion, setPortion] = useState(String(Math.round(result.porsiyon_gram) || 100))
  const [meal, setMeal] = useState<MealType | null>(null)

  const base = result.porsiyon_gram > 0 ? result.porsiyon_gram : 1
  const factor = (Number(portion) || 0) / base
  const kcal = Math.round(result.kalori * factor)
  const p = Math.round(result.protein * factor)
  const c = Math.round(result.karbonhidrat * factor)
  const f = Math.round(result.yag * factor)

  function confirm() {
    const q = Number(portion)
    if (!q || q <= 0 || !meal) return
    onConfirm({
      name: result.yemek_adi,
      per100g: portionToPer100g(result),
      quantity_g: q,
      meal_type: meal,
    })
  }

  return (
    <View>
      <Card>
        <Text variant="subtitle">{result.yemek_adi}</Text>

        <View style={{ marginVertical: spacing.md }}>
          <Hairline />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip label="KCAL" value={`${kcal}`} />
          <StatChip label="PROTEİN" value={`${p}g`} color={colors.protein} />
          <StatChip label="KARB" value={`${c}g`} color={colors.carb} />
          <StatChip label="YAĞ" value={`${f}g`} color={colors.fat} />
        </View>

        <View style={{ marginVertical: spacing.md }}>
          <Hairline />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="eyebrow">PORSİYON</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Input keyboardType="numeric" value={portion} onChangeText={setPortion}
              style={{ width: 70, textAlign: 'center', fontSize: 16, fontWeight: '700' }} />
            <Text variant="label">g</Text>
          </View>
        </View>

        <Text variant="eyebrow" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>ÖĞÜN</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {MEALS.map((m) => {
            const on = meal === m.type
            return (
              <Pressable key={m.type} onPress={() => setMeal(m.type)}
                style={{
                  flex: 1, paddingVertical: spacing.sm, borderRadius: 9, alignItems: 'center',
                  backgroundColor: on ? colors.accentSoft : colors.cardAlt,
                  borderWidth: 1, borderColor: on ? colors.accent : 'transparent',
                }}>
                <Text variant="label" color={on ? colors.accent : colors.textMuted}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      <Button icon="checkmark"
        title={isSaving ? 'Ekleniyor...' : 'Onayla ve Günlüğüme Ekle'}
        onPress={confirm} disabled={isSaving || !meal}
        style={{ marginTop: spacing.md }} />
      <Pressable onPress={onRetry} style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
        <Text variant="label" color={colors.textMuted}>Yeniden Tara</Text>
      </Pressable>
    </View>
  )
}
```

> **Agent B notu:** `Hairline`, `StatChip`, `Button` (icon/title/onPress/disabled/style), `Input` (style override), `Text` (variant/color/style), `colors.accentSoft`/`accentBorder`/`cardAlt` mevcut. Eğer `colors.accentSoft` yoksa `colors.accent + '15'` kullan. `StatChip` `color` opsiyonel — KCAL renksiz (varsayılan accent/white).

- [ ] **Step 2: tsc kapısı** (Task 1 + 3 tamamsa)

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 6: `scan-food.tsx` — tara ekranı (Agent B)

**Files:**
- Create: `mobile/src/app/(app)/scan-food.tsx`

- [ ] **Step 1: Ekranı yaz (idle / loading / error / result)**

expo-image-picker ile çek/seç → expo-image-manipulator ile resize 1024 + jpeg 0.5 + base64 → `useAnalyzeFood` → sonuç null ise error, değilse `FoodConfirmCard`. Onayda `useLogScannedFood` → `router.back()`.

```tsx
// mobile/src/app/(app)/scan-food.tsx
import { useState } from 'react'
import { View, Pressable, Image, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Screen, Text, Card, Button, ProgressBar } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useAnalyzeFood, useLogScannedFood, type AnalyzeFoodResult } from '../../lib/queries'
import { FoodConfirmCard } from '../../components/nutrition/FoodConfirmCard'
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
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Ayarlardan kamera/galeri iznini açman gerekiyor.')
      return
    }
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (picked.canceled || !picked.assets[0]) return

    const uri = picked.assets[0].uri
    setThumb(uri)
    setPhase('loading')

    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manip.base64) throw new Error('Görsel işlenemedi')
      const res = await analyze.mutateAsync({ imageBase64: manip.base64, mimeType: 'image/jpeg' })
      if (res.yemek_adi == null) {
        setErrMsg('Görselde yemek bulunamadı. Daha net bir fotoğraf dene.')
        setPhase('error')
        return
      }
      setResult(res)
      setPhase('result')
    } catch (e) {
      setErrMsg('Analiz başarısız oldu. Bağlantını kontrol edip tekrar dene.')
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle'); setResult(null); setThumb(null); setErrMsg('')
  }

  function confirm(args: Parameters<typeof FoodConfirmCard>[0]['onConfirm'] extends (a: infer A) => void ? A : never) {
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
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Yemeğini Tara</Text>

      {phase === 'idle' && (
        <>
          <Card style={{ borderStyle: 'dashed', alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text variant="subtitle" color={colors.textMuted}>📷 Yemeğini ortala ve çek</Text>
            <Text variant="label" style={{ marginTop: spacing.xs }}>Tek yemek, iyi ışık — daha doğru sonuç</Text>
          </Card>
          <Button icon="camera" title="Fotoğraf Çek" onPress={() => pick('camera')} style={{ marginTop: spacing.md }} />
          <Button icon="image" title="Galeriden Seç" variant="ghost" onPress={() => pick('library')} style={{ marginTop: spacing.sm }} />
        </>
      )}

      {phase === 'loading' && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          {thumb && <Image source={{ uri: thumb }} style={{ width: 120, height: 120, borderRadius: 12, opacity: 0.5, marginBottom: spacing.md }} />}
          <ActivityIndicator color={colors.accent} />
          <Text variant="label" style={{ marginTop: spacing.sm }}>Yapay zekâ analiz ediyor…</Text>
          <View style={{ width: '100%', marginTop: spacing.md }}><ProgressBar value={0.6} /></View>
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
            <Text variant="subtitle" color={colors.textMuted}>Yemek bulunamadı</Text>
            <Text variant="label" style={{ marginTop: spacing.xs, textAlign: 'center' }}>{errMsg}</Text>
          </Card>
          <Button icon="refresh" title="Tekrar Dene" onPress={reset} style={{ marginTop: spacing.md }} />
          <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <Text variant="label" color={colors.textMuted}>Vazgeç</Text>
          </Pressable>
        </>
      )}
    </Screen>
  )
}
```

> **Agent B notları:**
> - `Button` `variant="ghost"` mevcut değilse: bordered stil için `style` ile `{ backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }` geç. Önce `mobile/src/components/ui` index'ini oku, `Button` prop'larını teyit et.
> - `expo-image-manipulator` SDK 54'te `manipulateAsync` + `SaveFormat` API'si — kurulumdan sonra **https://docs.expo.dev/versions/v54.0.0/sdk/imagemanipulator/** doğrula (deprecation olmuş olabilir; varsa yeni `ImageManipulator.manipulate().resize().renderAsync()` zincirini kullan).
> - `ImagePicker.MediaTypeOptions` SDK 54'te `MediaType` olarak değişmiş olabilir — **https://docs.expo.dev/versions/v54.0.0/sdk/imagepicker/** teyit et.
> - `confirm` imzasındaki conditional type yerine sadeleştirmek istersen `FoodConfirmCard`'ın `onConfirm` arg tipini named export edip import et.

- [ ] **Step 2: Route'u doğrula**

`scan-food.tsx` `(app)/` altında olduğu için expo-router otomatik route üretir: `/(app)/scan-food`. Ekstra config gerekmez. `_layout.tsx`'te Stack varsa başlık eklenebilir (opsiyonel).

---

### Task 7: nutrition.tsx giriş noktası (Agent C)

**Files:**
- Modify: `mobile/src/app/(app)/nutrition.tsx`

- [ ] **Step 1: "Bugün" başlığının yanına Tara butonu ekle**

`nutrition.tsx` satır 42-43'teki tarih/başlık bloğunu satır içi bir aksiyon satırına çevir.

Mevcut:
```tsx
      <Text variant="label">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Bugün</Text>
```

Yeni:
```tsx
      <Text variant="label">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <Text variant="title">Bugün</Text>
        <Pressable onPress={() => router.push(`/(app)/scan-food?date=${date}`)}
          accessibilityRole="button"
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999,
          }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="camera" size={15} color={colors.accent} />
          <Text variant="label" color={colors.accent}>AI ile Tara</Text>
        </Pressable>
      </View>
```

`Pressable`, `Ionicons`, `router`, `colors` zaten import'lu. `colors.accentSoft` yoksa `colors.accent + '15'` kullan.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 8: Entegrasyon + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Tüm dosyalar yerinde — tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0, hata yok.

- [ ] **Step 2: Tek commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/src/lib/foodScan.ts mobile/src/lib/queries.ts \
  mobile/src/components/nutrition/FoodConfirmCard.tsx \
  mobile/src/app/\(app\)/scan-food.tsx mobile/src/app/\(app\)/nutrition.tsx \
  mobile/package.json supabase/functions/yemek-analiz-et/index.ts
git commit -m "feat(nutrition): AI ile yemek tara — Gemini 2.0-flash food scan"
```

- [ ] **Step 3: Edge Function deploy (KULLANICI — Task 2 Step 2)**

Secret + deploy yapılmadıysa şimdi yap.

- [ ] **Step 4: Native build (KULLANICI — native modül eklendi, OTA yetmez)**

Run: `cd mobile && eas build -p android --profile preview`
Telefona kur. (Sonraki JS değişiklikleri yine OTA gider.)

- [ ] **Step 5: Cihaz doğrulaması**

Nutrition ekranı → "📷 AI ile Tara" → fotoğraf çek → analiz → onay kartında öğün seç → "Onayla ve Günlüğüme Ekle" → nutrition listesinde + Stats'ta + kalori hedefinde görünmeli.

---

## Self-Review notları

- **Spec coverage:** Edge Function (Task 2) ✓, base64 transfer (Task 6) ✓, foods+food_entries entegrasyonu (Task 3 useLogScannedFood) ✓, per-portion→per-100g (Task 1) ✓, öğün seçimi (Task 5 chips) ✓, giriş noktası (Task 7) ✓, hata yönetimi (Task 6 error phase + Task 2 502/400) ✓, native rebuild (Task 8) ✓. Freemium = out of scope (spec ile uyumlu).
- **Tip tutarlılığı:** `ScanResult` (foodScan.ts) ↔ `AnalyzeFoodResult` (queries.ts) aynı 6 alan. `portionToPer100g` dönüşü ↔ `useLogScannedFood` `per100g` param ↔ `FoodConfirmCard` onConfirm `per100g` — hepsi `{calories_per_100g, protein_g, carb_g, fat_g}`. Edge Function çıktısı ↔ `AnalyzeFoodResult` aynı.
- **Bilinmeyen risk (Agent B teyit eder):** SDK 54'te expo-image-picker `MediaTypeOptions`→`MediaType` ve expo-image-manipulator `manipulateAsync`→yeni zincir API'si değişmiş olabilir; kurulum sonrası v54 docs'tan doğrulanacak (Task 6 notları).
