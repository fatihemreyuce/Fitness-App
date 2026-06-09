# Fitness App (Aşama 1)

Supabase (yerel/Docker) backend + Expo (React Native) mobil uygulama.
Antrenman takibi: egzersiz kütüphanesi, set/tekrar/kilo kaydı, geçmiş.

## Çalıştırma

### 1) Backend (Supabase)
```powershell
# Docker Desktop açık olmalı
supabase start          # yerel Supabase'i başlat
supabase status         # URL ve anahtarları gör
supabase db reset       # migration + seed'i yeniden uygula (verileri sıfırlar)
supabase stop           # durdur
```
- Studio: http://127.0.0.1:54323
- Gelen kutusu (e-posta testi / Mailpit): http://127.0.0.1:54324

> Not: Makinede aynı anda başka bir Supabase projesi çalışıyorsa port çakışır.
> Diğerini `supabase stop --project-id <ad>` ile durdur veya config.toml'da portları değiştir.

### 2) Mobil (Expo)
```powershell
cd mobile
npx expo start          # Metro başlat, telefonda Expo Go ile QR'ı okut
```

## Ortam değişkenleri
- `mobile/.env` (git'e girmez):
  - `EXPO_PUBLIC_SUPABASE_URL` → bilgisayarının **LAN IP**'si (örn. `http://192.168.3.160:54321`).
    Telefon `localhost`'a ulaşamaz; gerçek cihaz için LAN IP şart. Android emülatörde `http://10.0.2.2:54321`.
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` → Supabase'in verdiği **publishable** anahtarı (`sb_publishable_...`).
- `.env.local` (kök, git'e girmez): Google OAuth gizli anahtarları (Bölüm 3'te eklenecek).

## Mimari
```
supabase/migrations   # şema + RLS politikaları + profil trigger
supabase/seed.sql     # 32 hazır egzersiz
mobile/src/lib        # supabase istemcisi, auth context, TanStack Query hook'ları
mobile/src/app        # Expo Router ekranları: (auth) ve (app) grupları
```

## Durum
- ✅ Backend: şema, RLS (sahiplik bazlı), profil trigger, seed
- ✅ Mobil: e-posta/şifre auth, egzersiz kütüphanesi (+özel), antrenman ekle/listele/detay, profil
- ⏳ Google OAuth: ertelendi (Bölüm 3 — Google Cloud Console adımları gerekli)
- ⏳ Aşama 2: Beslenme & kalori · Aşama 3: İlerleme & istatistik
