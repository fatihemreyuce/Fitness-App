# Login & Register — Athlete Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login/Register ekranlarını "Athlete Hero" diline taşı — tam ekran sinematik foto + FitLens markası + Welcome karşılama ekranı + ayrı Giriş/Kayıt formları, auth mantığı değişmeden.

**Architecture:** 3 ekran (`welcome` yeni, `login`/`signup` rewrite) ortak parçalar üstüne kurulur: `AuthBackground` (ImageBackground + pure-View kararma + marka), `FadeOverlay` (OTA-safe gradient), `AuthField` (ikonlu input + şifre toggle), `GoogleAuthButton`. Gömülü hero foto. Kök layout yönlendirmesi welcome'a çevrilir. Yeni native modül yok → OTA-safe.

**Tech Stack:** Expo SDK 54, React 19, expo-router 6, Supabase JS. `ImageBackground` (RN core), `expo-image` YOK, `expo-linear-gradient` YOK (gradient pure-View). Mevcut: `Button`/`Text` (ui), `signInWithGoogle` (`lib/googleAuth.ts`), `supabase` (`lib/supabase.ts`).

**Design ref:** `docs/superpowers/specs/2026-06-15-auth-redesign-design.md`

**Test notu:** Test runner YOK. Doğrulama: `cd mobile && npx tsc --noEmit` + cihaz doğrulaması (OTA sonrası). `expo-env.d.ts` (`expo/types`) jpg/png require'larını tipler.

---

## Agent Split (paralel execution)

Dosyalar çakışmıyor → 4 iş kolu paralel. Agent'lar **commit ETMEZ**; orchestrator entegrasyonda asset indirir + tek `tsc` + commit yapar.

- **Agent A — Görsel iskelet:** Task 1, 2. (`FadeOverlay.tsx`, `AuthBackground.tsx`)
- **Agent B — Form parçaları:** Task 3, 4. (`AuthField.tsx`, `GoogleAuthButton.tsx`)
- **Agent C — Welcome + routing:** Task 5, 8. (`welcome.tsx`, kök `_layout.tsx`)
- **Agent D — Giriş/Kayıt:** Task 6, 7. (`login.tsx`, `signup.tsx`)

C/D, A'nın `AuthBackground` ve B'nin `AuthField`/`GoogleAuthButton` imzalarına göre kodlar (bu planda kilitli).

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/src/components/auth/FadeOverlay.tsx` | pure-View dikey gradient | Create |
| `mobile/src/components/auth/AuthBackground.tsx` | ImageBackground + kararma + marka iskeleti | Create |
| `mobile/src/components/auth/AuthField.tsx` | ikonlu input + şifre göster/gizle | Create |
| `mobile/src/components/auth/GoogleAuthButton.tsx` | hero-stilli Google butonu | Create |
| `mobile/src/app/(auth)/welcome.tsx` | karşılama ekranı | Create |
| `mobile/src/app/(auth)/login.tsx` | giriş — rewrite | Rewrite |
| `mobile/src/app/(auth)/signup.tsx` | kayıt — rewrite | Rewrite |
| `mobile/src/app/_layout.tsx` | yönlendirme welcome'a | Modify (1 satır) |
| `mobile/assets/images/auth-hero.jpg` | gömülü hero foto | İndir (orchestrator) |

---

### Task 1: `FadeOverlay.tsx` (Agent A)

**Files:**
- Create: `mobile/src/components/auth/FadeOverlay.tsx`

- [ ] **Step 1: Pure-View gradient'i yaz**

```tsx
// mobile/src/components/auth/FadeOverlay.tsx
import { View } from 'react-native'

// Pure-View dikey gradient: üst saydam → alt opak `color`. expo-linear-gradient YOK = OTA-safe.
// Eşit yükseklikte `steps` bant; opaklık `from`→`to` doğrusal artar.
export function FadeOverlay({
  height,
  color = '#0d0f12',
  from = 0,
  to = 1,
  steps = 14,
}: {
  height: number
  color?: string
  from?: number
  to?: number
  steps?: number
}) {
  return (
    <View style={{ height }} pointerEvents="none">
      {Array.from({ length: steps }).map((_, i) => {
        const t = steps > 1 ? i / (steps - 1) : 1
        return <View key={i} style={{ flex: 1, backgroundColor: color, opacity: from + (to - from) * t }} />
      })}
    </View>
  )
}
```

**Manuel akıl-yürütme:** steps=14 → 14 bant, üst bant opacity≈0 (foto görünür), alt bant opacity=1 (düz `#0d0f12`, buton okunur). `pointerEvents="none"` → dokunuşlar alttaki forma geçer.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 2: `AuthBackground.tsx` (Agent A)

**Files:**
- Create: `mobile/src/components/auth/AuthBackground.tsx`

- [ ] **Step 1: İskeleti yaz**

`logo-glow.png` (`mobile/assets/`) ve `auth-hero.jpg` (`mobile/assets/images/`) gömülür. `FadeOverlay` (Task 1) kullanılır. `expo-env.d.ts` jpg/png require'larını tipler.

```tsx
// mobile/src/components/auth/AuthBackground.tsx
import { type ReactNode } from 'react'
import { ImageBackground, KeyboardAvoidingView, Platform, View, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { FadeOverlay } from './FadeOverlay'

const HERO = require('../../../assets/images/auth-hero.jpg')
const LOGO = require('../../../assets/logo-glow.png')

export function AuthBackground({ children, showTagline = false }: { children: ReactNode; showTagline?: boolean }) {
  return (
    <ImageBackground source={HERO} style={{ flex: 1, backgroundColor: colors.bg }} resizeMode="cover">
      {/* alt kararma — form/metin okunabilirliği */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <FadeOverlay height={460} from={0} to={1} />
      </View>
      {/* üst hafif kararma — marka kontrastı */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 170, backgroundColor: colors.bg, opacity: 0.35 }}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1, paddingHorizontal: spacing.lg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Image source={LOGO} style={{ width: 56, height: 56, borderRadius: 16 }} resizeMode="contain" />
            <Text variant="title" style={{ marginTop: spacing.sm }}>FitLens</Text>
            {showTagline ? (
              <Text variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                Antrenman & beslenme, tek yerde
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.xl }}>{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}
```

> Not: `auth-hero.jpg` orchestrator tarafından entegrasyonda indirilir (Task 9). `tsc` dosya varlığını DEĞİL tip bildirimini kontrol eder → asset olmadan da tsc geçer; ama `eas update` bundle'ı için asset gerekir.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1 tamamlanmış olmalı).

---

### Task 3: `AuthField.tsx` (Agent B)

**Files:**
- Create: `mobile/src/components/auth/AuthField.tsx`

- [ ] **Step 1: İkonlu input + şifre toggle'ı yaz**

```tsx
// mobile/src/components/auth/AuthField.tsx
import { useState } from 'react'
import { View, TextInput, Pressable, type TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../theme'

// Hero üzerinde yarı-saydam input. `secure` → sağda göster/gizle toggle.
export function AuthField({
  icon,
  secure = false,
  ...props
}: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; secure?: boolean }) {
  const [hidden, setHidden] = useState(secure)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        placeholderTextColor={colors.textMuted}
        secureTextEntry={hidden}
        {...props}
        style={{ flex: 1, paddingVertical: 14, color: colors.text, fontSize: 15 }}
      />
      {secure ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  )
}
```

> Not: Ekranlar alanları `<View style={{ gap: spacing.md }}>` ile sarar (aralık için); `AuthField`'a `style` geçilmez.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 4: `GoogleAuthButton.tsx` (Agent B)

**Files:**
- Create: `mobile/src/components/auth/GoogleAuthButton.tsx`

- [ ] **Step 1: Hero-stilli Google butonunu yaz**

`signInWithGoogle()` (`lib/googleAuth.ts`) discriminated union döner: `{status:'success'} | {status:'cancelled'} | {status:'error';message}`.

```tsx
// mobile/src/components/auth/GoogleAuthButton.tsx
import { useState } from 'react'
import { Alert, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius } from '../../theme'
import { signInWithGoogle } from '../../lib/googleAuth'

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false)

  async function onPress() {
    setLoading(true)
    const result = await signInWithGoogle()
    setLoading(false)
    if (result.status === 'error') Alert.alert('Giriş hatası', result.message)
    // success → onAuthStateChange yönlendirir; cancelled → sessiz
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          borderRadius: radius.md,
          paddingVertical: 13,
        },
        (pressed || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={17} color={colors.text} />
          <Text variant="body" color={colors.text} style={{ fontWeight: '700' }}>Google ile devam et</Text>
        </>
      )}
    </Pressable>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 5: `welcome.tsx` karşılama ekranı (Agent C)

**Files:**
- Create: `mobile/src/app/(auth)/welcome.tsx`

- [ ] **Step 1: Ekranı yaz**

`AuthBackground` (Task 2) + `GoogleAuthButton` (Task 4). "Başla" → Kayıt; "Giriş yap" → Giriş.

```tsx
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
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 2, 4 tamamlanmış olmalı).

---

### Task 6: `login.tsx` rewrite (Agent D)

**Files:**
- Rewrite: `mobile/src/app/(auth)/login.tsx`

- [ ] **Step 1: Ekranı yeniden yaz (mantık aynı)**

`signInWithPassword` mantığı korunur; sunum `AuthBackground`+`AuthField`+`GoogleAuthButton`'a taşınır.

```tsx
// mobile/src/app/(auth)/login.tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthBackground } from '../../components/auth/AuthBackground'
import { AuthField } from '../../components/auth/AuthField'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'
import { Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

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
    <AuthBackground>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Giriş Yap</Text>
      <View style={{ gap: spacing.md }}>
        <AuthField icon="mail-outline" placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AuthField icon="lock-closed-outline" placeholder="Şifre" secure value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} loading={loading} disabled={loading} />
        <GoogleAuthButton />
      </View>
      <Link href="/(auth)/signup" style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Hesabın yok mu? Kayıt ol</Text>
      </Link>
    </AuthBackground>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 2, 3, 4 tamamlanmış olmalı).

---

### Task 7: `signup.tsx` rewrite (Agent D)

**Files:**
- Rewrite: `mobile/src/app/(auth)/signup.tsx`

- [ ] **Step 1: Ekranı yeniden yaz (mantık aynı, e-posta doğrulama mesajı korunur)**

```tsx
// mobile/src/app/(auth)/signup.tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AuthBackground } from '../../components/auth/AuthBackground'
import { AuthField } from '../../components/auth/AuthField'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'
import { Text, Button } from '../../components/ui'
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
    <AuthBackground>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Kayıt Ol</Text>
      <View style={{ gap: spacing.md }}>
        <AuthField icon="mail-outline" placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AuthField icon="lock-closed-outline" placeholder="Şifre (en az 6 karakter)" secure value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} loading={loading} disabled={loading} />
        <GoogleAuthButton />
      </View>
      <Link href="/(auth)/login" style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten hesabın var mı? Giriş yap</Text>
      </Link>
    </AuthBackground>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 8: Kök yönlendirme `_layout.tsx` (Agent C)

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

- [ ] **Step 1: Giriş yapmamış kullanıcıyı welcome'a yönlendir**

Mevcut satır:
```tsx
      router.replace('/(auth)/login')
```
Yeni:
```tsx
      router.replace('/(auth)/welcome')
```
(Sadece bu bir satır; `inAuthGroup` kontrolü ve geri kalan mantık aynı kalır.)

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 9: Entegrasyon + asset + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Hero fotoğrafını indir (orchestrator)**

Koyu/sinematik, lisanssız bir atlet fotoğrafı `mobile/assets/images/auth-hero.jpg` olarak indirilir (alt kısmı doğal koyu olan bir kare). Örnek (Unsplash, ~1080px):

```bash
cd "C:/Users/fatih/fitness-app/mobile"
curl -L -o assets/images/auth-hero.jpg "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&q=80"
```
Beklenen: dosya oluşur (>50KB). (Kullanıcı sonra kendi görseliyle değiştirebilir — aynı yol/ad.)

- [ ] **Step 2: Tüm dosyalar yerinde — tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0, hata yok.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/src/components/auth/ mobile/src/app/\(auth\)/welcome.tsx \
  mobile/src/app/\(auth\)/login.tsx mobile/src/app/\(auth\)/signup.tsx \
  mobile/src/app/_layout.tsx mobile/assets/images/auth-hero.jpg
git commit -m "feat(auth): Athlete Hero redesign — welcome + giris/kayit, marka + foto hero (OTA-safe)"
```

- [ ] **Step 4: OTA yayını (KULLANICI veya orchestrator)**

Yeni native modül yok → OTA yeterli.
Run: `cd mobile && eas update --branch preview --platform android -m "auth redesign"`
Expected: update grubu yayınlanır; `auth-hero.jpg` asset olarak yüklenir. (Env `mobile/.env`'den okunur — 3 anahtar mevcut.)

- [ ] **Step 5: Cihaz doğrulaması (KULLANICI)**

1. Çıkış yap → **Welcome** ekranı: hero foto + FitLens + tagline + "Başla"/"Giriş yap".
2. "Başla" → Kayıt ekranı; e-posta+şifre, şifre göster/gizle çalışır; kayıt → e-posta doğrulama mesajı.
3. "Giriş yap" → Giriş ekranı; mevcut hesapla giriş çalışır.
4. Google ile devam et → hesap seçici, giriş çalışır.
5. Klavye açılınca inputlar görünür kalır (KeyboardAvoidingView).

---

## Self-Review notları

- **Spec coverage:** Welcome (Task 5) ✓; Giriş redesign (Task 6, mantık korunur) ✓; Kayıt redesign (Task 7, e-posta doğrulama korunur) ✓; AuthBackground (Task 2) ✓; FadeOverlay pure-View gradient (Task 1) ✓; AuthField ikon+şifre toggle (Task 3) ✓; GoogleAuthButton (Task 4, signInWithGoogle reuse) ✓; routing welcome'a (Task 8) ✓; gömülü hero asset (Task 9 Step 1) ✓; OTA (Task 9 Step 4) ✓. Şifremi unuttum = kapsam dışı (spec ile uyumlu) ✓.
- **Tip tutarlılığı:** `AuthBackground` props `{children, showTagline?}` ↔ welcome/login/signup kullanımı aynı. `AuthField` props `TextInputProps & {icon, secure?}` ↔ ekranlardaki `icon=...`/`secure` kullanımı aynı. `GoogleAuthButton` props yok ↔ ekranlar `<GoogleAuthButton/>`. `FadeOverlay` props `{height, color?, from?, to?, steps?}` ↔ AuthBackground `height/from/to` kullanımı aynı. `signInWithGoogle()` dönüş tipi (`status:'error'` → `.message`) doğru daraltılır.
- **Placeholder taraması:** Yok — her adımda tam kod.
- **Risk:** (1) `require` ile jpg/png — `expo-env.d.ts`/`expo/types` tipler, tsc geçer; asset dosyası bundle (OTA) için Task 9 Step 1'de indirilir. (2) Welcome ekranı yeni route — expo-router typedRoutes `.expo/types/router.d.ts` yeniden üretilmeli (Task 9'dan sonra gerekirse orchestrator `(auth)/welcome` girişini ekler veya `npx expo start` ile regen eder; FitLens scan-food'da aynı durum yaşandı). (3) `(auth)` Stack başlangıç route'u artık iki ekran içeriyor; başlangıç welcome olur çünkü kök layout oraya replace eder.
