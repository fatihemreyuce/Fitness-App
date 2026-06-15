# Login & Register — Athlete Hero Redesign (Design Spec)

**Tarih:** 2026-06-15
**Durum:** Onaylandı (brainstorming — görsel companion ile)

## Amaç

Mevcut auth ekranları (`login.tsx`, `signup.tsx`) işlevsel ama markasız ve sade: koyu zeminde ortalanmış başlık + 2 input + buton. Bunları **"Athlete Hero"** diline taşı: tam ekran sinematik atlet fotoğrafı + marka kimliği (FitLens) + alttan form. Güçlü ilk izlenim, premium his (Nike/Gymshark dili).

Auth **mantığı değişmez** (Supabase email/password + Google) — yalnızca UI + akış yenilenir. **Tamamen OTA-safe** (yeni native modül yok).

## Brainstorming Kararları

- **Marka:** FitLens + tagline *"Antrenman & beslenme, tek yerde"* — logo + ad + tagline.
- **Görsel dil:** Athlete Hero — tam ekran fotoğraf + alttan form.
- **Fotoğraf:** Gömülü (bundled) ücretsiz stok atlet fotoğrafı; kullanıcı sonra değiştirebilir.
- **Akış:** Karşılama (Welcome) ekranı + ayrı Giriş/Kayıt ekranları; hero foto üçünde de sabit.
- **Şifremi unuttum:** v1 **kapsam dışı** (Supabase reset akışı gerektirir). Satır-içi canlı validasyon da v1 dışı.

## Kritik Teknik Kısıt — OTA-safe gradient

`expo-linear-gradient` projede YOK ve eklenmesi native rebuild gerektirir (OTA'yı bozar). Bu yüzden hero'nun alt kararma gradient'i **pure-View** ile yapılır (mevcut grafiklerdeki OTA-safe felsefeyle aynı): üst üste bindirilmiş, opaklığı kademeli artan saydam `View` satırları. `ImageBackground` React Native çekirdeğindedir (native dep değil); gömülü foto `require()` ile `eas update` tarafından asset olarak yüklenir.

## Mimari

3 ekran + 4 ortak parça + 1 asset. Yeni DB yok, yeni native modül yok.

### Ekran akışı
- **Welcome** (`app/(auth)/welcome.tsx`, yeni — başlangıç auth route'u): AuthBackground (marka+tagline) + "Formda kal." başlığı + **Başla** butonu (→ `/(auth)/signup`) + GoogleAuthButton + "Zaten üye misin? **Giriş yap**" linki (→ `/(auth)/login`).
- **Giriş** (`app/(auth)/login.tsx`, rewrite): AuthBackground (kompakt marka) + AuthField e-posta + AuthField şifre (göster/gizle) + "Giriş Yap" butonu + GoogleAuthButton + "Hesabın yok mu? **Kayıt ol**" linki. Mantık: `supabase.auth.signInWithPassword` (mevcut).
- **Kayıt** (`app/(auth)/signup.tsx`, rewrite): aynı yapı, "Kayıt Ol" butonu + "Zaten hesabın var mı? **Giriş yap**" linki. Mantık: `supabase.auth.signUp` + e-posta doğrulama mesajı (mevcut: session yoksa "E-postanı doğrula" Alert'i).

### Ortak parçalar
- **`components/auth/FadeOverlay.tsx`** — pure-View dikey gradient. Props: `height`, `color` (varsayılan `#0d0f12`), `from` (üstteki başlangıç opaklığı, varsayılan 0). ~12 mutlak-konumlu `View` satırı, opaklık 0→1. OTA-safe, native yok.
- **`components/auth/AuthBackground.tsx`** — tüm auth ekranlarının iskeleti. `ImageBackground` (gömülü hero) + üstte hafif + altta güçlü `FadeOverlay` (form/metin okunabilirliği) + üstte marka başlığı (logo `logo-glow.png` Image + "FitLens" + opsiyonel tagline) + `SafeAreaView` + `KeyboardAvoidingView`. Props: `children`, `showTagline?: boolean` (welcome'da true, form ekranlarında false/kompakt). Form ekranlarında marka daha küçük.
- **`components/auth/AuthField.tsx`** — yarı-saydam input. Props: `TextInputProps` + `icon: keyof typeof Ionicons.glyphMap` (öncü ikon) + `secure?: boolean` (true ise sağda göster/gizle 👁 toggle, dahili state). Hero üzerinde okunur kontrast (rgba beyaz zemin + beyaz metin + muted placeholder).
- **`components/auth/GoogleAuthButton.tsx`** — hero'ya uygun yarı-saydam "Google ile devam et" butonu (`logo-google` ikonu). Mevcut `signInWithGoogle()` helper'ını (`lib/googleAuth.ts`, discriminated `{status:'success'|'cancelled'|'error'}`) çağırır; `error` → `Alert`, `cancelled` → sessiz, `success` → `onAuthStateChange` yönlendirir. Dahili `loading` state. (Mevcut `GoogleSignInButton.tsx` "veya" divider'lı haliyle kalır ama auth ekranlarında bunun yerine yeni hero-stilli buton kullanılır.)

### Asset
- **`assets/images/auth-hero.jpg`** — koyu/sinematik atlet/spor salonu fotoğrafı (ücretsiz lisans, ör. Unsplash). Alt kısmı doğal koyu olan bir kare seçilir ki FadeOverlay ile metin net okunsun. Uygulama-yapım adımında indirilir.

### Yönlendirme
- **`app/_layout.tsx`** (Modify, 1 satır): giriş yapmamış kullanıcı `router.replace('/(auth)/login')` → `router.replace('/(auth)/welcome')`. Geri kalan auth gating mantığı aynı.

## Veri Akışı / Mantık
- Email/password ve Google auth mantığı **birebir mevcut koddan** taşınır (yalnız sunum değişir). Yeni hook/sorgu yok.
- `AuthField` kontrollü input; ekran kendi `useState`'ini tutar (mevcut desen).

## Hata / Yükleme Durumları
- Buton `loading` state'i (mevcut `Button loading` prop'u) — "Giriş Yap"/"Kayıt Ol"/Google sırasında spinner.
- Supabase hatası: mevcut `Alert.alert('Giriş hatası'/'Kayıt hatası', error.message)` deseni korunur.
- Kayıt'ta e-posta doğrulama: session yoksa mevcut "E-postanı doğrula" Alert'i korunur.

## Doğrulama Kapısı
Test runner yok → `cd mobile && npx tsc --noEmit` + cihaz doğrulaması (OTA sonrası). Saf parça (`FadeOverlay`) görsel; mantık değişmediği için regresyon riski düşük.

## OTA
Yeni native modül yok (`ImageBackground` core, gradient pure-View, foto bundled asset). `eas update --branch preview --platform android` ile yayınlanır. Asset (`auth-hero.jpg`) `eas update` tarafından yüklenir (mevcut OTA'larda asset yükleme doğrulanmış).

## Kapsam Dışı (YAGNI)
- "Şifremi unuttum" / parola sıfırlama (Supabase reset e-posta akışı).
- Satır-içi canlı form validasyonu (mevcut Alert + temel kontroller yeterli).
- Kayıt'ta ayrı "ad" alanı (display name başka yerde yönetiliyor).
- Onboarding/tanıtım slaytları.

## Başarı Kriterleri
- Giriş yapmamış kullanıcı **Welcome** ekranıyla karşılaşır (hero foto + FitLens marka + "Başla"/"Giriş yap").
- Welcome → Başla → Kayıt; Welcome → Giriş yap → Giriş; ekranlar arası geçiş ve linkler çalışır.
- Giriş/Kayıt/Google auth eskisi gibi çalışır (mantık değişmedi).
- Şifre göster/gizle ve input ikonları çalışır; klavye inputu kapatmaz.
- Hero foto + pure-View gradient ile metin/form her ekranda net okunur.
- `tsc` temiz; OTA ile yayınlanır (native rebuild gerekmez).
