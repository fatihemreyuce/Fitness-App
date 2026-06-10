# Google ile Giriş — Tasarım

**Tarih:** 2026-06-10
**Durum:** Onaylandı, plana geçiliyor
**Proje:** fitness-app / mobile (Expo SDK 54)

## Amaç

Mevcut e-posta/şifre girişine ek olarak, native Google hesap seçici ile tek
dokunuşta giriş eklemek. E-posta/şifre girişi korunur — kullanıcı iki yöntemden
birini seçebilir.

## Kararlar (brainstorm çıktısı)

- **UX:** Native hesap seçici (`@react-native-google-signin/google-signin`),
  tarayıcı akışı değil. Daha şık UX, karşılığında yeni APK build gerekiyor.
- **Kapsam:** E-posta/şifre **ve** Google birlikte. Google-only değil.
- **Hesap eşleşmesi:** Supabase automatic account linking açık — aynı (doğrulanmış)
  e-posta ile gelen Google kimliği mevcut hesaba bağlanır, ayrı hesap oluşmaz.
  Google e-postaları doğrulanmış geldiği için bu güvenli.

## Mimari / Akış

```
[Google ile devam et]
   → GoogleSignin.signIn()                                    // native hesap seçici
   → { idToken } döner
   → supabase.auth.signInWithIdToken({ provider:'google', token: idToken })
   → Supabase session oluşur
   → mevcut supabase.auth.onAuthStateChange tetiklenir
   → mevcut AuthProvider session'ı yakalar → app'e yönlendirir
```

Kritik nokta: `mobile/src/lib/auth.tsx` (AuthProvider) ve `supabase.ts` **hiç
değişmiyor**. Google girişi mevcut session akışına bağlanan yeni bir giriş
noktasından ibaret. Bu, blast radius'u küçük tutuyor.

## Bileşenler / Kod Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `mobile/package.json` | `@react-native-google-signin/google-signin` eklenir (native modül — yeni APK sebebi) |
| `mobile/app.json` | `plugins` dizisine google-signin config plugin eklenir |
| `mobile/src/lib/googleAuth.ts` | **Yeni.** `signInWithGoogle()` helper: GoogleSignin.configure (webClientId) + signIn + Supabase `signInWithIdToken`. Tek sorumluluk, izole, hata tiplerini dışa anlamlı döndürür. |
| `mobile/src/app/(auth)/login.tsx` | Forma ek "Google ile devam et" butonu + "veya" ayıracı |
| `mobile/src/app/(auth)/signup.tsx` | Aynı buton (kayıt = giriş, Google'da fark yok) |
| `mobile/src/lib/auth.tsx` | **Değişiklik yok** |
| `mobile/src/lib/supabase.ts` | **Değişiklik yok** |

Buton mevcut `Button` bileşeniyle (`icon="logo-google"` — Ionicons) çizilir, tema
tutarlı kalır (dark + lime accent).

## Dış Kurulum (kullanıcı manuel yapacak)

Bu özelliğin ağırlığı koddan çok config tarafında. Üç yerde ayar:

1. **Google Cloud Console** — proje + iki OAuth client:
   - **Web client** → client ID + secret (Supabase'e girilecek)
   - **Android client** → package `com.collbrai.fitness` + APK keystore **SHA-1**
2. **EAS credentials** — preview build keystore'unun SHA-1'i alınır
   (`eas credentials` interaktif) ve Google Android client'a girilir.
   *SHA-1 eşleşmezse `DEVELOPER_ERROR` alınır — native Google sign-in'in en sık
   takılınan adımı budur.*
3. **Supabase Dashboard** — Auth → Providers → Google açılır, Web client ID +
   secret girilir. Automatic account linking aktif bırakılır.

Kodda yalnızca **webClientId** referans edilir. Android client kodda kullanılmaz
ama Google projesinde doğru SHA-1 ile **var olması** şart (bilinen tuzak).

webClientId build ortamına `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env değişkeni
olarak (eas.json preview/production env'lerine) eklenir — Supabase URL/anon key
ile aynı desen.

## Build & Yayın

- `eas build --profile preview --platform android` → yeni APK → telefona kurulum.
- Bu sefer OTA **değil**, gerçek yeni APK (native modül eklendi).
- Sonraki JS-only değişiklikler yine OTA ile gidebilir.

## Edge Case'ler

- **İptal** (`statusCodes.SIGN_IN_CANCELLED`) → sessizce yut, hata gösterme.
- **Play Services yok/eski** (`PLAY_SERVICES_NOT_AVAILABLE`) → anlaşılır Türkçe uyarı.
- **Diğer hatalar** → mevcut desenle `Alert.alert('Giriş hatası', ...)`.
- **idToken null** → savunmacı kontrol, anlamlı hata.

## Doğrulama

- `npx tsc --noEmit` yeşil (projede jest yok; doğrulama = tsc + görsel).
- Görsel kabul: APK'de "Google ile devam et" → native seçici → app açılır →
  Profil'de doğru hesap görünür.
- Aynı e-posta ile daha önce email/şifre hesabı varsa → ayrı hesap oluşmadığı,
  aynı hesaba bağlandığı doğrulanır.

## Kapsam Dışı (YAGNI)

- iOS Google sign-in (proje şu an Android-only dağıtım).
- Apple ile giriş.
- Google-only akış / email-password kaldırma.
- Hesap ayarlarından "bağlı hesapları yönet" ekranı.
