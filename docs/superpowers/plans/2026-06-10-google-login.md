# Google ile Giriş — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut e-posta/şifre girişine ek olarak native Google hesap seçici ile giriş eklemek (Supabase `signInWithIdToken`).

**Architecture:** `@react-native-google-signin/google-signin` native hesap seçiciyi açar, bir `idToken` döner; bu token Supabase `signInWithIdToken({ provider:'google' })`'a verilir, Supabase session oluşturur, mevcut `AuthProvider`'ın `onAuthStateChange` dinleyicisi yönlendirmeyi yapar. `auth.tsx` ve `supabase.ts` değişmez. Native modül eklendiği için yeni APK build gerekir.

**Tech Stack:** Expo SDK 54.0.35, React Native 0.81.5, React 19.1.0, expo-router, Supabase JS, `@react-native-google-signin/google-signin`.

**Test note:** Projede jest/test runner YOK. Her kod görevinin doğrulama kapısı `npx tsc --noEmit` (yeşil olmalı). Nihai davranış doğrulaması yeni APK üzerinde görsel/manuel yapılır (Task 6). `googleAuth.ts` native modül glue'su olduğu için izole birim testi anlamlı değil — bu kasıtlı bir karar, eksiklik değil.

**Çalışma dizini:** Tüm yollar repo kökünden (`C:\Users\fatih\fitness-app`). Komutlar `mobile/` içinden çalıştırılır.

---

## Görev Sırası ve Bağımlılık

Kod görevleri (1-4) önce → kullanıcının dış kurulumu (5) → build + doğrulama (6).
Task 5 ve 6 kullanıcının Google Cloud / Supabase dashboard işlemlerini gerektirir; bu yüzden en sonda.

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/package.json` | google-signin bağımlılığı | Modify (expo install) |
| `mobile/app.json` | config plugin | Modify |
| `mobile/eas.json` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env | Modify (Task 5) |
| `mobile/src/lib/googleAuth.ts` | Native sign-in + Supabase idToken glue, tek sorumluluk | Create |
| `mobile/src/components/GoogleSignInButton.tsx` | "— veya —" ayıracı + Google butonu + handler (DRY, 2 ekranda kullanılır) | Create |
| `mobile/src/app/(auth)/login.tsx` | Butonu ekrana yerleştir | Modify |
| `mobile/src/app/(auth)/signup.tsx` | Butonu ekrana yerleştir | Modify |
| `mobile/src/lib/auth.tsx` | — | Değişmez |
| `mobile/src/lib/supabase.ts` | — | Değişmez |

---

### Task 1: Bağımlılığı kur + config plugin ekle

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app.json`

- [ ] **Step 1: Bağımlılığı SDK-uyumlu sürümle kur**

`mobile/` içinden çalıştır:

```bash
npx expo install @react-native-google-signin/google-signin
```

`expo install` Expo SDK 54 ile uyumlu sürümü otomatik seçer (sürümü tahmin etme, expo'ya bırak). `package.json`'a yeni satır eklenmiş olmalı.

- [ ] **Step 2: app.json plugins dizisine config plugin ekle**

`mobile/app.json` içindeki `plugins` dizisini bul:

```json
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-web-browser"
    ],
```

`"expo-web-browser"` satırından sonra google-signin plugin'ini ekle (Android için temel akışta ekstra config gerekmez):

```json
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-web-browser",
      "@react-native-google-signin/google-signin"
    ],
```

- [ ] **Step 3: tsc ile doğrula**

Run (`mobile/` içinden): `npx tsc --noEmit`
Expected: Hata yok (yeni dosya henüz yok; sadece dep + json değişti).

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app.json
git commit -m "chore(mobile): add @react-native-google-signin/google-signin + config plugin"
```

> Not: `package-lock.json` yoksa (`yarn`/`pnpm` ise) onun yerine ilgili lock dosyasını ekle. `git status` ile kontrol et.

---

### Task 2: googleAuth.ts helper'ı oluştur

**Files:**
- Create: `mobile/src/lib/googleAuth.ts`

- [ ] **Step 1: Helper'ı yaz**

`mobile/src/lib/googleAuth.ts` oluştur:

```typescript
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

// Google sign-in'i bir kez yapılandır. webClientId, Google Cloud Console'daki
// **Web** OAuth client'ından gelir ve EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID env'i
// ile build'e girer (eas.json). Android client kodda referans edilmez ama
// Google projesinde doğru SHA-1 ile var olmalıdır.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
})

export type GoogleSignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()

    // Yeni sürümlerde iptal, throw yerine response.type === 'cancelled' döner.
    if (!isSuccessResponse(response)) {
      return { status: 'cancelled' }
    }

    const idToken = response.data.idToken
    if (!idToken) {
      return { status: 'error', message: 'Google kimlik doğrulaması başarısız (token alınamadı).' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) {
      return { status: 'error', message: error.message }
    }

    // Başarı: supabase.auth.onAuthStateChange (AuthProvider) yönlendirmeyi yapar.
    return { status: 'success' }
  } catch (error) {
    // Eski sürüm davranışı: iptal/hatalar throw edilebilir.
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
        case statusCodes.IN_PROGRESS:
          return { status: 'cancelled' }
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { status: 'error', message: 'Google Play Services yüklü değil veya güncel değil.' }
        default:
          return { status: 'error', message: error.message ?? 'Google ile giriş başarısız.' }
      }
    }
    return { status: 'error', message: 'Beklenmeyen bir hata oluştu.' }
  }
}
```

- [ ] **Step 2: tsc ile doğrula**

Run (`mobile/` içinden): `npx tsc --noEmit`
Expected: Hata yok. (Eğer `isSuccessResponse`/`response.data.idToken` tip hatası verirse, kurulan sürümün API'sini `node_modules/@react-native-google-signin/google-signin` tip tanımlarından doğrula ve `response.data` erişimini ona göre düzelt — sürümler arası küçük farklar olabilir.)

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/googleAuth.ts
git commit -m "feat(mobile): signInWithGoogle helper (native google-signin + supabase idToken)"
```

---

### Task 3: GoogleSignInButton bileşenini oluştur

**Files:**
- Create: `mobile/src/components/GoogleSignInButton.tsx`

DRY: bu bileşen "— veya —" ayıracını + Google butonunu + handler'ı kapsüller; login ve signup ekranlarında tek satırla kullanılır. Başarıda yönlendirme `AuthProvider`'da olduğu için bileşene `onSuccess` callback'i gerekmez.

- [ ] **Step 1: Bileşeni yaz**

`mobile/src/components/GoogleSignInButton.tsx` oluştur:

```tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Button, Text } from './ui'
import { signInWithGoogle } from '../lib/googleAuth'
import { colors, spacing } from '../theme'

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)

  async function onPress() {
    setLoading(true)
    const result = await signInWithGoogle()
    setLoading(false)
    if (result.status === 'error') {
      Alert.alert('Giriş hatası', result.message)
    }
    // success → onAuthStateChange yönlendirir; cancelled → sessizce geç
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="label" color={colors.textMuted}>veya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <Button
        title="Google ile devam et"
        icon="logo-google"
        variant="ghost"
        onPress={onPress}
        loading={loading}
      />
    </View>
  )
}
```

- [ ] **Step 2: tsc ile doğrula**

Tema token'ları doğrulandı: `colors.border` (#23272f) ve `colors.textMuted` (#9aa0ab) `mobile/src/theme/index.ts` içinde mevcut.

Run: `npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/GoogleSignInButton.tsx
git commit -m "feat(mobile): GoogleSignInButton component (divider + google button)"
```

---

### Task 4: Login ve Signup ekranlarına yerleştir

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`
- Modify: `mobile/src/app/(auth)/signup.tsx`

- [ ] **Step 1: login.tsx'e import ve buton ekle**

`mobile/src/app/(auth)/login.tsx` — import satırını güncelle (mevcut):

```tsx
import { Screen, Text, Input, Button } from '../../components/ui'
```

altına ekle:

```tsx
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
```

Sonra ana giriş `Button`'ından sonra, `Link`'ten önce `<GoogleSignInButton />` ekle. Hedef bölüm şu hale gelmeli:

```tsx
        <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} disabled={loading} />
        <GoogleSignInButton />
        <Link href="/(auth)/signup" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Hesabın yok mu? Kayıt ol</Text>
        </Link>
```

- [ ] **Step 2: signup.tsx'e import ve buton ekle**

`mobile/src/app/(auth)/signup.tsx` — import satırının altına ekle:

```tsx
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
```

Ana `Button`'dan sonra, `Link`'ten önce `<GoogleSignInButton />` ekle:

```tsx
        <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} disabled={loading} />
        <GoogleSignInButton />
        <Link href="/(auth)/login" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten hesabın var mı? Giriş yap</Text>
        </Link>
```

- [ ] **Step 3: tsc ile doğrula**

Run (`mobile/` içinden): `npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(auth)/login.tsx mobile/src/app/(auth)/signup.tsx
git commit -m "feat(mobile): add Google sign-in button to login & signup screens"
```

---

### Task 5: Dış kurulum — Google Cloud + Supabase + EAS env (KULLANICI)

Bu görev koddan çok dashboard işidir; **kullanıcı (Fatih) yapar**, Claude talimat verir. Sıra önemli.

- [ ] **Step 1: Google Cloud Console — proje + OAuth consent screen**

1. https://console.cloud.google.com → yeni proje (veya mevcut) seç.
2. "APIs & Services" → "OAuth consent screen" → External → uygulama adı/destek e-postası gir, kaydet.

- [ ] **Step 2: Web OAuth client oluştur**

"APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID" → **Web application**.
- İsim: `Fitness Web (Supabase)`
- Oluştur → **Client ID** ve **Client secret**'ı not al. (Bu Client ID, koddaki `webClientId` ve Supabase'e girilecek değer.)

- [ ] **Step 3: EAS keystore SHA-1'ini al**

`mobile/` içinden (interaktif — Claude çalıştıramaz, kullanıcı yapar):

```bash
npx eas-cli credentials
```

→ platform **Android** → profil **preview** → keystore'u görüntüle → **SHA-1 Fingerprint**'i kopyala.
(Alternatif: https://expo.dev → proje → Credentials → Android → SHA-1.)

- [ ] **Step 4: Android OAuth client oluştur**

"Credentials" → "Create Credentials" → "OAuth client ID" → **Android**.
- İsim: `Fitness Android`
- Package name: `com.collbrai.fitness`
- SHA-1: Step 3'teki değer.
- Oluştur. (Bu client kodda kullanılmaz ama var olması ve SHA-1'in doğru olması şarttır — yoksa cihazda `DEVELOPER_ERROR` alınır.)

- [ ] **Step 5: Supabase — Google provider'ı aç**

https://supabase.com/dashboard → proje `basgwbnidemhmxvwpqpb` → Authentication → Providers → **Google** → Enable.
- "Client ID (for OAuth)": Step 2'deki **Web** Client ID.
- "Client Secret": Step 2'deki secret.
- Kaydet.
- Authentication → Providers altında "Allow manual linking" / otomatik hesap bağlama ayarını kontrol et: aynı doğrulanmış e-posta ile mevcut hesaba bağlanması için bırak.

- [ ] **Step 6: eas.json'a webClientId env ekle**

`mobile/eas.json` içinde `preview.env` ve `production.env` bloklarına Step 2'deki Web Client ID'yi ekle:

```json
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://basgwbnidemhmxvwpqpb.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<mevcut anon key, dokunma>",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "<Step 2 Web Client ID>"
      },
```

(Web Client ID gizli değildir — anon key gibi public'tir, secret değil. Secret'ı buraya KOYMA, o yalnız Supabase'de.)

- [ ] **Step 7: Commit**

```bash
git add mobile/eas.json
git commit -m "chore(mobile): add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to eas build env"
```

---

### Task 6: Build + manuel doğrulama

**Files:** yok (build + cihaz testi)

- [ ] **Step 1: Yeni preview APK build et**

`mobile/` içinden (kullanıcı çalıştırır, EAS hesabı gerekir):

```bash
npx eas-cli build --profile preview --platform android
```

Build bitince EAS bir APK indirme linki verir. **Bu OTA değil — gerçek yeni APK** (native modül eklendi).

- [ ] **Step 2: APK'yi telefona kur**

Eski uygulamanın üzerine kur (link/QR ile indir, kur).

- [ ] **Step 3: Görsel doğrulama — happy path**

1. Uygulamayı aç → giriş ekranı.
2. "Google ile devam et" → native hesap seçici açılmalı.
3. Bir hesap seç → uygulama ana ekrana girmeli.
4. Profil sekmesinde doğru hesabın göründüğünü kontrol et.

- [ ] **Step 4: Görsel doğrulama — edge case'ler**

- Hesap seçiciyi **iptal et** → uygulama giriş ekranında kalmalı, hata alert'i ÇIKMAMALI.
- (Mümkünse) daha önce e-posta/şifre ile kayıt olduğun **aynı e-posta** ile Google'a gir → ayrı hesap oluşmamalı, aynı hesaba bağlanmalı (önceki antrenman/beslenme verisi görünür).

- [ ] **Step 5: `DEVELOPER_ERROR` alırsan**

Bu neredeyse her zaman SHA-1 uyuşmazlığıdır:
- Build'in keystore SHA-1'i (Task 5 Step 3) Google Android client'ındaki (Step 4) ile birebir aynı mı?
- Package name `com.collbrai.fitness` mi?
- Web Client ID hem `eas.json`'da hem Supabase'de aynı mı?
Düzelt → gerekiyorsa yeniden build.

- [ ] **Step 6: Doğrulama notu**

Tüm akış çalışınca: hafızaya (`MEMORY.md` + ilgili proje notu) "Google login shipped, yeni APK, channel preview, webClientId env'de" notu düş ki sonraki OTA/by build kararlarında bağlam kaybolmasın.

---

## Self-Review (plan yazarı kontrolü)

- **Spec coverage:** ✅ Native akış (Task 2), iki ekranda buton + email korunur (Task 3-4), Google Cloud + SHA-1 + Supabase (Task 5), yeni APK build (Task 6), edge case'ler (Task 2 helper + Task 6 manuel), account linking (Task 5 Step 5 + Task 6 Step 4). Spec'in "Kapsam Dışı" maddeleri planda yok (doğru).
- **Placeholder scan:** Kasıtlı `<...>` yer tutucuları yalnız kullanıcının dolduracağı dış değerler (Web Client ID, SHA-1) — bunlar plan eksikliği değil, doğası gereği kullanıcıya ait runtime sırları/kimlikleri.
- **Type consistency:** `signInWithGoogle(): Promise<GoogleSignInResult>` (Task 2) ↔ `GoogleSignInButton` tüketimi (Task 3) tutarlı; `result.status === 'error'` ve `result.message` alanları `GoogleSignInResult` tipinde tanımlı. Button props (`title`, `icon`, `variant`, `loading`, `onPress`) gerçek `Button.tsx` imzasıyla eşleşiyor.
- **Test gerçeği:** Jest yok; doğrulama tsc + manuel. Bu plan boyunca tutarlı şekilde belirtildi.
