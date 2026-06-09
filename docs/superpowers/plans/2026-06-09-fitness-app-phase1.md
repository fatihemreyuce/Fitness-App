# Fitness Uygulaması — Aşama 1 Uygulama Planı

> **Agentic worker'lar için:** GEREKLİ ALT-SKILL: Bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans`
> kullanın. Adımlar takip için checkbox (`- [ ]`) sözdizimi kullanır.

**Goal:** Docker ile yerel çalışan bir Supabase backend (RLS + auth + seed egzersizler) ve buna bağlanan, e-posta/şifre + Google ile giriş yapılabilen, antrenman kaydedilebilen bir Expo (React Native) mobil uygulaması inşa etmek.

**Architecture:** Backend tamamen Supabase CLI + Docker ile yerelde çalışır; şema migration dosyalarıyla, başlangıç egzersizleri `seed.sql` ile yönetilir. RLS her tabloda açıktır. Mobil taraf Expo Router (dosya tabanlı navigasyon) + TanStack Query (sunucu verisi) + `@supabase/supabase-js` (AsyncStorage ile kalıcı oturum) kullanır.

**Tech Stack:** Supabase (Postgres, Auth, RLS), Docker Desktop, Supabase CLI, React Native + Expo (TypeScript), Expo Router, TanStack Query.

> **Platform notu:** Tüm komutlar Windows 11 + PowerShell içindir. Backend `C:\Users\fatih\fitness-app` içinde, mobil uygulama ise `C:\Users\fatih\fitness-app\mobile` içinde olacaktır.

---

## Dosya Yapısı

```
fitness-app/
├─ supabase/
│  ├─ config.toml                                  # CLI yapılandırması (Google auth, redirect URL'ler)
│  ├─ migrations/
│  │  ├─ <ts>_create_initial_schema.sql            # 5 tablo + RLS
│  │  └─ <ts>_create_profile_trigger.sql           # yeni kullanıcı → profil trigger
│  └─ seed.sql                                      # hazır egzersizler
├─ .env.local                                       # Google OAuth gizli anahtarları (git'e GİRMEZ)
└─ mobile/
   ├─ app/
   │  ├─ _layout.tsx                                # kök layout + auth guard + Query provider
   │  ├─ (auth)/
   │  │  ├─ _layout.tsx
   │  │  ├─ login.tsx
   │  │  └─ signup.tsx
   │  └─ (app)/
   │     ├─ _layout.tsx                             # sekme/stack düzeni
   │     ├─ index.tsx                               # antrenman geçmişi
   │     ├─ new-workout.tsx
   │     ├─ workout/[id].tsx
   │     ├─ exercises.tsx
   │     └─ profile.tsx
   ├─ lib/
   │  ├─ supabase.ts                                # Supabase istemcisi
   │  ├─ auth.tsx                                   # AuthContext + useAuth
   │  └─ queries.ts                                 # TanStack Query hook'ları
   ├─ app.json                                      # Expo yapılandırması (scheme dahil)
   └─ .env                                          # EXPO_PUBLIC_* değişkenleri
```

---

# BÖLÜM 1 — Ön Gereksinimler (Windows)

### Task 1: Geliştirme araçlarını kur ve doğrula

**Files:** (yok — sistem kurulumu)

- [ ] **Step 1: Node.js LTS kurulu mu kontrol et**

Run:
```powershell
node --version
```
Expected: `v20.x.x` veya `v22.x.x` (LTS). Komut bulunamazsa https://nodejs.org adresinden LTS sürümünü kur ve PowerShell'i yeniden aç.

- [ ] **Step 2: Git'i doğrula**

Run:
```powershell
git --version
```
Expected: `git version 2.x.x`. Yoksa https://git-scm.com/download/win adresinden kur.

- [ ] **Step 3: Docker Desktop'ı kur ve çalıştır**

https://www.docker.com/products/docker-desktop adresinden Docker Desktop'ı kur, başlat ve sağ alttaki balina ikonunun "Engine running" dediğinden emin ol. Sonra:
```powershell
docker --version
docker ps
```
Expected: `Docker version 2x.x` ve `docker ps` hatasız boş bir tablo döner (`CONTAINER ID  IMAGE ...`). Hata verirse Docker Desktop çalışmıyordur — başlat ve bekle.

- [ ] **Step 4: Supabase CLI'yi Scoop ile kur**

> Windows'ta Supabase CLI'nin önerilen kurulumu Scoop iledir (`npm -g` desteklenmez).

Scoop yoksa önce onu kur:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```
Sonra Supabase CLI:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

- [ ] **Step 5: Supabase CLI'yi doğrula**

Run:
```powershell
supabase --version
```
Expected: bir sürüm numarası (örn. `2.x.x`).

---

# BÖLÜM 2 — Supabase Backend

### Task 2: Supabase projesini başlat

**Files:**
- Create: `supabase/config.toml` (CLI tarafından otomatik oluşturulur)

- [ ] **Step 1: Proje klasöründe Supabase'i başlat**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app
supabase init
```
Expected: `Finished supabase init.` ve `supabase/` klasörü oluşur (`config.toml`, `seed.sql` vb.).

- [ ] **Step 2: Yerel Supabase stack'ini ayağa kaldır**

> İlk çalıştırma Docker imajlarını indireceği için birkaç dakika sürebilir.

Run:
```powershell
supabase start
```
Expected: Çıktının sonunda şuna benzer bir tablo:
```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJhbGci...
service_role key: eyJhbGci...
```
**Bu `anon key`'i kopyala — Bölüm 4'te mobil uygulamada kullanacağız.** (Daha sonra `supabase status` ile tekrar görebilirsin.)

- [ ] **Step 3: Studio'yu tarayıcıda aç ve gör**

http://127.0.0.1:54323 adresini aç. Expected: Supabase Studio arayüzü açılır, henüz tablo yoktur. `.gitignore`'a şunu eklediğini doğrula (Supabase init genelde ekler):
```powershell
Select-String -Path .gitignore -Pattern "supabase/.branches","supabase/.temp" -SimpleMatch
```
Yoksa `.gitignore`'a şu satırları ekle: `supabase/.branches`, `supabase/.temp`, `.env.local`.

- [ ] **Step 4: Commit**

```powershell
git add supabase .gitignore
git commit -m "chore: initialize local supabase project"
```

---

### Task 3: İlk şema migration'ı (5 tablo + RLS)

**Files:**
- Create: `supabase/migrations/<timestamp>_create_initial_schema.sql`

- [ ] **Step 1: Boş migration dosyası oluştur**

Run:
```powershell
supabase migration new create_initial_schema
```
Expected: `supabase/migrations/` altında `<timestamp>_create_initial_schema.sql` adlı boş dosya oluşur.

- [ ] **Step 2: Migration dosyasını şu SQL ile doldur**

Yeni oluşan dosyaya tamamen şunu yaz:
```sql
-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============ exercises ============
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.exercises enable row level security;

-- owner_id NULL = herkese açık (hazır) egzersiz; dolu = kullanıcının özel egzersizi
create policy "exercises_select_public_or_own" on public.exercises
  for select using (owner_id is null or owner_id = auth.uid());
create policy "exercises_insert_own" on public.exercises
  for insert with check (owner_id = auth.uid());
create policy "exercises_update_own" on public.exercises
  for update using (owner_id = auth.uid());
create policy "exercises_delete_own" on public.exercises
  for delete using (owner_id = auth.uid());

-- ============ workouts ============
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);
alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select using (user_id = auth.uid());
create policy "workouts_insert_own" on public.workouts
  for insert with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update using (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts
  for delete using (user_id = auth.uid());

-- ============ workout_sets ============
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null,
  reps int not null,
  weight_kg numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.workout_sets enable row level security;

-- Sahiplik kontrolü ilgili workout üzerinden yapılır
create policy "sets_select_via_workout" on public.workout_sets
  for select using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy "sets_insert_via_workout" on public.workout_sets
  for insert with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy "sets_update_via_workout" on public.workout_sets
  for update using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy "sets_delete_via_workout" on public.workout_sets
  for delete using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));

-- Performans için indeksler
create index workout_sets_workout_id_idx on public.workout_sets(workout_id);
create index workouts_user_id_idx on public.workouts(user_id);
create index exercises_owner_id_idx on public.exercises(owner_id);
```

- [ ] **Step 3: Migration'ı uygula (DB sıfırla)**

Run:
```powershell
supabase db reset
```
Expected: `Applying migration <timestamp>_create_initial_schema.sql...` ardından `Finished supabase db reset.` Hata yoksa şema kuruldu.

- [ ] **Step 4: Tabloları doğrula**

Studio'da (http://127.0.0.1:54323) **Table Editor**'ı aç. Expected: `profiles`, `exercises`, `workouts`, `workout_sets` tabloları görünür ve her birinde "RLS enabled" rozeti vardır.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations
git commit -m "feat(db): add initial schema with RLS for profiles, exercises, workouts, sets"
```

---

### Task 4: Yeni kullanıcı → otomatik profil trigger'ı

**Files:**
- Create: `supabase/migrations/<timestamp>_create_profile_trigger.sql`

- [ ] **Step 1: Migration oluştur**

Run:
```powershell
supabase migration new create_profile_trigger
```

- [ ] **Step 2: Dosyayı şu SQL ile doldur**

```sql
-- Yeni bir auth.users kaydı oluştuğunda otomatik bir profiles satırı oluşturur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Uygula**

Run:
```powershell
supabase db reset
```
Expected: İki migration da sırayla uygulanır, `Finished supabase db reset.`

- [ ] **Step 4: Trigger'ı test et (manuel kullanıcı oluştur)**

Studio → **Authentication** → **Add user** → "Create new user" ile `test@example.com` / `password123` oluştur. Sonra Table Editor → `profiles` tablosuna bak.
Expected: `profiles` tablosunda yeni kullanıcının id'siyle, `display_name = "test"` olan bir satır otomatik oluşmuştur.

- [ ] **Step 5: Test kullanıcısını sil ve commit**

Studio → Authentication → test kullanıcısını sil (temizlik). Sonra:
```powershell
git add supabase/migrations
git commit -m "feat(db): auto-create profile on new user signup"
```

---

### Task 5: Hazır egzersiz kütüphanesi (seed)

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: seed.sql'i hazır egzersizlerle doldur**

`supabase/seed.sql` dosyasının içeriğini tamamen şununla değiştir (owner_id verilmez → NULL → herkese açık):
```sql
insert into public.exercises (name, muscle_group, equipment) values
  ('Bench Press', 'chest', 'barbell'),
  ('Incline Bench Press', 'chest', 'barbell'),
  ('Dumbbell Press', 'chest', 'dumbbell'),
  ('Push Up', 'chest', 'bodyweight'),
  ('Chest Fly', 'chest', 'dumbbell'),
  ('Pull Up', 'back', 'bodyweight'),
  ('Lat Pulldown', 'back', 'cable'),
  ('Barbell Row', 'back', 'barbell'),
  ('Seated Cable Row', 'back', 'cable'),
  ('Deadlift', 'back', 'barbell'),
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Lateral Raise', 'shoulders', 'dumbbell'),
  ('Front Raise', 'shoulders', 'dumbbell'),
  ('Face Pull', 'shoulders', 'cable'),
  ('Barbell Curl', 'biceps', 'barbell'),
  ('Dumbbell Curl', 'biceps', 'dumbbell'),
  ('Hammer Curl', 'biceps', 'dumbbell'),
  ('Tricep Pushdown', 'triceps', 'cable'),
  ('Skull Crusher', 'triceps', 'barbell'),
  ('Dips', 'triceps', 'bodyweight'),
  ('Back Squat', 'legs', 'barbell'),
  ('Front Squat', 'legs', 'barbell'),
  ('Leg Press', 'legs', 'machine'),
  ('Lunge', 'legs', 'dumbbell'),
  ('Leg Curl', 'legs', 'machine'),
  ('Leg Extension', 'legs', 'machine'),
  ('Calf Raise', 'legs', 'machine'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Plank', 'core', 'bodyweight'),
  ('Crunch', 'core', 'bodyweight'),
  ('Hanging Leg Raise', 'core', 'bodyweight'),
  ('Russian Twist', 'core', 'bodyweight');
```

- [ ] **Step 2: Seed'i uygula**

Run:
```powershell
supabase db reset
```
Expected: `Seeding data from supabase/seed.sql...` mesajı görünür ve hata olmaz.

- [ ] **Step 3: Doğrula**

Studio → Table Editor → `exercises`. Expected: 32 satır, hepsinde `owner_id` boş (NULL).

- [ ] **Step 4: Commit**

```powershell
git add supabase/seed.sql
git commit -m "feat(db): seed predefined exercise library"
```

---

# BÖLÜM 3 — Google OAuth

> Google girişi iki parçadır: (a) Google Cloud'da bir OAuth istemcisi oluşturmak, (b) bunu yerel Supabase'e `config.toml` üzerinden bağlamak. Google Cloud arayüzü zaman zaman değişebilir; takılırsan https://supabase.com/docs/guides/auth/social-login/auth-google resmî rehberine bak.

### Task 6: Google Cloud'da OAuth istemcisi oluştur

**Files:**
- Create: `.env.local` (proje kökünde, gizli anahtarlar — git'e girmez)

- [ ] **Step 1: Google Cloud projesi oluştur**

https://console.cloud.google.com adresine git → üstteki proje seçiciden **New Project** → ad: `fitness-app` → Create.

- [ ] **Step 2: OAuth consent screen yapılandır**

Sol menü → **APIs & Services → OAuth consent screen** → User Type: **External** → Create. Uygulama adı `Fitness App`, destek e-postası olarak kendi e-postanı gir, kaydet. **Test users** bölümüne giriş yapacağın Google hesabını ekle.

- [ ] **Step 3: OAuth client ID oluştur**

**APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application** → Name: `fitness-supabase-local`.
**Authorized redirect URIs** alanına şunu ekle:
```
http://127.0.0.1:54321/auth/v1/callback
```
Create → açılan kutudaki **Client ID** ve **Client secret** değerlerini kopyala.

- [ ] **Step 4: Gizli anahtarları .env.local'e yaz**

Proje kökünde (`C:\Users\fatih\fitness-app`) `.env.local` dosyası oluştur:
```
SUPABASE_AUTH_GOOGLE_CLIENT_ID=buraya-client-id
SUPABASE_AUTH_GOOGLE_SECRET=buraya-client-secret
```
`.gitignore`'da `.env.local` olduğunu doğrula:
```powershell
Select-String -Path .gitignore -Pattern ".env.local" -SimpleMatch
```
Yoksa ekle. **Bu dosya asla commit edilmez.**

---

### Task 7: Google provider'ı yerel Supabase'e bağla

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: config.toml'a Google auth bloğu ekle**

`supabase/config.toml` dosyasının sonuna şunu ekle:
```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
```

- [ ] **Step 2: Mobil deep-link redirect URL'lerini ekle**

`config.toml` içindeki `[auth]` bölümünü bul ve `site_url` / `additional_redirect_urls` satırlarını şöyle güncelle (uygulama scheme'imiz `fitnessapp`):
```toml
[auth]
site_url = "fitnessapp://"
additional_redirect_urls = ["fitnessapp://**", "http://127.0.0.1:54321/auth/v1/callback"]
```

- [ ] **Step 3: Supabase'i .env.local ile yeniden başlat**

> Supabase CLI, başlatılırken proje kökündeki `.env.local`'i okur; `env(...)` ifadeleri bu dosyadan dolar.

Run:
```powershell
supabase stop
supabase start
```
Expected: Hata olmadan başlar.

- [ ] **Step 4: Doğrula**

Run:
```powershell
supabase status
```
Expected: Çıktıda hata yok. (Google butonunu Bölüm 5'te mobil uygulamada uçtan uca test edeceğiz.)

- [ ] **Step 5: Commit**

```powershell
git add supabase/config.toml
git commit -m "feat(auth): enable Google OAuth and mobile deep-link redirects"
```

---

# BÖLÜM 4 — Expo Projesi

### Task 8: Expo uygulamasını oluştur ve çalıştır

**Files:**
- Create: `mobile/` (Expo tarafından oluşturulur)

- [ ] **Step 1: Expo projesini oluştur**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app
npx create-expo-app@latest mobile
```
Expected: `mobile/` klasörü, Expo Router + TypeScript ile kurulur. (Varsayılan şablon Expo Router ve TS içerir.)

- [ ] **Step 2: Başlangıç şablonunu sıfırla**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile
npm run reset-project
```
Expected: Örnek ekranlar `app-example/`'a taşınır, temiz bir `app/` kalır. Sorarsa örnek dosyaları silmeyi seçebilirsin.

- [ ] **Step 3: İlk kez çalıştır**

Run:
```powershell
npx expo start
```
Expected: Bir QR kod ve `Metro waiting on exp://...` görünür. Telefonunda **Expo Go** uygulamasını kur, QR'ı okut → boş/varsayılan ekran açılır. Terminalde `Ctrl+C` ile durdur.

- [ ] **Step 4: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile
git commit -m "chore(mobile): scaffold expo app with expo-router"
```

---

### Task 9: Bağımlılıkları kur ve Supabase istemcisini bağla

**Files:**
- Create: `mobile/lib/supabase.ts`
- Create: `mobile/.env`
- Modify: `mobile/app.json`

- [ ] **Step 1: Gerekli paketleri kur**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill @tanstack/react-query expo-web-browser expo-linking
```
Expected: Paketler `package.json`'a eklenir, hata olmaz.

- [ ] **Step 2: Uygulama scheme'ini ayarla**

`mobile/app.json` içinde `expo` nesnesine `scheme` alanını ekle/güncelle (Bölüm 3'teki `fitnessapp` ile eşleşmeli):
```json
{
  "expo": {
    "scheme": "fitnessapp"
  }
}
```
> Not: `app.json` içinde başka alanlar zaten vardır; sadece `scheme` satırını `expo` nesnesinin içine ekle, diğerlerini silme.

- [ ] **Step 3: Ortam değişkenleri dosyasını oluştur**

`mobile/.env` oluştur. `SUPABASE_URL` için **bilgisayarının LAN IP'sini** kullan (telefon `localhost`'a ulaşamaz). IP'yi öğren:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" }).IPAddress
```
Sonra `mobile/.env` içeriği (IP'yi ve Task 2'deki anon key'i yerleştir):
```
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.X:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=Task2deki-anon-key
```
> Emülatör kullanıyorsan: Android emülatörde `http://10.0.2.2:54321`, iOS simülatörde `http://127.0.0.1:54321` kullan.

`.env`'in git'e girmediğini doğrula — `mobile/.gitignore` zaten `.env*` içerir:
```powershell
Select-String -Path .gitignore -Pattern ".env" -SimpleMatch
```

- [ ] **Step 4: Supabase istemcisini yaz**

`mobile/lib/supabase.ts` oluştur:
```ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Uygulama ön plandayken token'ı otomatik yenile, arka planda durdur
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```

- [ ] **Step 5: Bağlantıyı doğrula (geçici test ekranı)**

`mobile/app/index.tsx`'i geçici olarak şununla değiştir:
```tsx
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Index() {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) setError(error.message)
        else setCount(count)
      })
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {error ? <Text>Hata: {error}</Text> : <Text>Egzersiz sayısı: {count ?? '...'}</Text>}
    </View>
  )
}
```
Run: `npx expo start` ve telefonda aç.
Expected: Ekranda **"Egzersiz sayısı: 32"** yazar. Yazmıyorsa: (1) `supabase start` çalışıyor mu, (2) `.env`'deki IP doğru mu, (3) telefon ve bilgisayar aynı Wi-Fi'da mı kontrol et. Doğruladıktan sonra `Ctrl+C`.

- [ ] **Step 6: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/lib mobile/app.json mobile/app/index.tsx mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add supabase client and verify db connection"
```

---

# BÖLÜM 5 — Auth Ekranları + Oturum Yönetimi

### Task 10: AuthContext + useAuth hook

**Files:**
- Create: `mobile/lib/auth.tsx`

- [ ] **Step 1: AuthContext'i yaz**

`mobile/lib/auth.tsx` oluştur:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthState = { session: Session | null; loading: boolean }
const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/lib/auth.tsx
git commit -m "feat(mobile): add auth context and useAuth hook"
```

---

### Task 11: Kök layout — Query provider + auth guard

**Files:**
- Create: `mobile/app/_layout.tsx` (varsa içeriğini değiştir)

- [ ] **Step 1: Kök layout'u yaz**

`mobile/app/_layout.tsx` içeriğini tamamen şununla değiştir:
```tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../lib/auth'

const queryClient = new QueryClient()

function RootNavigator() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(app)')
    }
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/app/_layout.tsx
git commit -m "feat(mobile): root layout with query provider and auth guard"
```

---

### Task 12: Giriş ve kayıt ekranları (e-posta/şifre + Google)

**Files:**
- Create: `mobile/app/(auth)/_layout.tsx`
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/app/(auth)/signup.tsx`

- [ ] **Step 1: Auth grubu layout'u**

`mobile/app/(auth)/_layout.tsx` oluştur:
```tsx
import { Stack } from 'expo-router'
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2: Google ile giriş yardımcı fonksiyonu + login ekranı**

`mobile/app/(auth)/login.tsx` oluştur:
```tsx
import { useState } from 'react'
import { Alert, Button, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '../../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) { Alert.alert('Google girişi hatası', error.message); return }
  if (!data.url) return

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type === 'success') {
    const url = new URL(result.url)
    const params = new URLSearchParams(url.hash.substring(1)) // #access_token=...
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token })
    }
  }
}

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
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 12 }}>Giriş Yap</Text>
      <TextInput
        placeholder="E-posta" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} disabled={loading} />
      <Button title="Google ile Giriş Yap" onPress={signInWithGoogle} />
      <Link href="/(auth)/signup" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Hesabın yok mu? Kayıt ol
      </Link>
    </View>
  )
}
```

- [ ] **Step 3: Kayıt ekranı**

`mobile/app/(auth)/signup.tsx` oluştur:
```tsx
import { useState } from 'react'
import { Alert, Button, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) Alert.alert('Kayıt hatası', error.message)
    else Alert.alert('Başarılı', 'Hesap oluşturuldu. Giriş yapabilirsin.')
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 12 }}>Kayıt Ol</Text>
      <TextInput
        placeholder="E-posta" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} disabled={loading} />
      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 12, color: '#2563eb' }}>
        Zaten hesabın var mı? Giriş yap
      </Link>
    </View>
  )
}
```

- [ ] **Step 4: E-posta kayıt/giriş akışını test et**

> Yerel geliştirmede `config.toml` içinde `[auth.email] enable_confirmations` varsayılan olarak kapalıdır, yani e-posta doğrulaması beklenmeden giriş yapılabilir. (E-posta doğrulama testi için Inbucket: http://127.0.0.1:54324)

Run: `cd mobile; npx expo start` ve telefonda aç.
Expected: Önce login ekranı açılır (auth guard). Kayıt ol → giriş yap → `(app)` grubuna yönlenir (şu an boş olabilir, sonraki task'ta dolduracağız). Studio → Authentication'da yeni kullanıcıyı ve `profiles`'da otomatik satırı gör.

- [ ] **Step 5: Google girişini test et**

Login ekranında "Google ile Giriş Yap"a bas. Expected: Tarayıcı açılır, Google hesabını seçersin (Task 6'da eklediğin test kullanıcısı), uygulamaya geri döner ve oturum açılır. Hata alırsan redirect URI ve `config.toml` redirect ayarlarını tekrar kontrol et.

- [ ] **Step 6: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(auth)"
git commit -m "feat(mobile): email/password and Google login + signup screens"
```

---

# BÖLÜM 6 — Antrenman Özellikleri

### Task 13: Veri tipleri ve Query hook'ları

**Files:**
- Create: `mobile/lib/queries.ts`

- [ ] **Step 1: Tipleri ve hook'ları yaz**

`mobile/lib/queries.ts` oluştur:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  owner_id: string | null
}

export type Workout = {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  notes: string | null
}

export type WorkoutSet = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  reps: number
  weight_kg: number
}

// --- Egzersizler ---
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useAddExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; muscle_group: string; equipment: string | null }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('exercises').insert({
        ...input,
        owner_id: userData.user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

// --- Antrenmanlar ---
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from('workouts').select('*').order('started_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useWorkoutSets(workoutId: string) {
  return useQuery({
    queryKey: ['workout_sets', workoutId],
    queryFn: async (): Promise<(WorkoutSet & { exercise: Exercise })[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*, exercise:exercises(*)')
        .eq('workout_id', workoutId)
        .order('set_number')
      if (error) throw error
      return data as any
    },
  })
}

// Bir antrenmanı tüm setleriyle birlikte oluşturur
export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      notes: string | null
      sets: { exercise_id: string; set_number: number; reps: number; weight_kg: number }[]
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data: workout, error: wErr } = await supabase
        .from('workouts')
        .insert({ user_id: userData.user!.id, notes: input.notes, ended_at: new Date().toISOString() })
        .select()
        .single()
      if (wErr) throw wErr

      if (input.sets.length > 0) {
        const rows = input.sets.map((s) => ({ ...s, workout_id: workout.id }))
        const { error: sErr } = await supabase.from('workout_sets').insert(rows)
        if (sErr) throw sErr
      }
      return workout as Workout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/lib/queries.ts
git commit -m "feat(mobile): data types and TanStack Query hooks"
```

---

### Task 14: (app) grubu layout'u — sekmeler

**Files:**
- Create: `mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Sekme düzenini yaz**

`mobile/app/(app)/_layout.tsx` oluştur:
```tsx
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
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/_layout.tsx"
git commit -m "feat(mobile): app tab layout"
```

---

### Task 15: Egzersiz kütüphanesi ekranı (+ özel egzersiz ekleme)

**Files:**
- Create: `mobile/app/(app)/exercises.tsx`

- [ ] **Step 1: Ekranı yaz**

`mobile/app/(app)/exercises.tsx` oluştur:
```tsx
import { useState } from 'react'
import { Alert, Button, FlatList, Text, TextInput, View } from 'react-native'
import { useExercises, useAddExercise } from '../../lib/queries'

export default function Exercises() {
  const { data: exercises, isLoading } = useExercises()
  const addExercise = useAddExercise()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')

  function onAdd() {
    if (!name || !muscle) { Alert.alert('Eksik', 'İsim ve kas grubu gerekli'); return }
    addExercise.mutate(
      { name, muscle_group: muscle, equipment: null },
      { onSuccess: () => { setName(''); setMuscle('') }, onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput placeholder="Egzersiz adı" value={name} onChangeText={setName}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Kas grubu" value={muscle} onChangeText={setMuscle}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <Button title="Ekle" onPress={onAdd} />
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 16 }}>
              {item.name} {item.owner_id ? '⭐' : ''}
            </Text>
            <Text style={{ color: '#666' }}>{item.muscle_group}{item.equipment ? ` · ${item.equipment}` : ''}</Text>
          </View>
        )}
      />
    </View>
  )
}
```

- [ ] **Step 2: Test et**

Run: `cd mobile; npx expo start`, "Egzersizler" sekmesine git.
Expected: 32 hazır egzersiz listelenir. Bir özel egzersiz ekle (örn. "Cable Crossover" / "chest") → listede ⭐ ile görünür. Studio → `exercises`'da `owner_id`'si dolu yeni satırı gör.

- [ ] **Step 3: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/exercises.tsx"
git commit -m "feat(mobile): exercise library screen with custom exercise add"
```

---

### Task 16: Antrenman geçmişi (ana ekran)

**Files:**
- Create: `mobile/app/(app)/index.tsx` (Task 9'daki geçici içeriğin üzerine yaz)

- [ ] **Step 1: Ekranı yaz**

`mobile/app/(app)/index.tsx` içeriğini tamamen şununla değiştir:
```tsx
import { Button, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useWorkouts } from '../../lib/queries'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="+ Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: 16 }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/workout/${item.id}`)}
            style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee' }}
          >
            <Text style={{ fontSize: 16 }}>
              {new Date(item.started_at).toLocaleString('tr-TR')}
            </Text>
            {item.notes ? <Text style={{ color: '#666' }}>{item.notes}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/index.tsx"
git commit -m "feat(mobile): workout history home screen"
```

---

### Task 17: Yeni antrenman ekranı (egzersiz seç + set ekle + kaydet)

**Files:**
- Create: `mobile/app/(app)/new-workout.tsx`

- [ ] **Step 1: Ekranı yaz**

`mobile/app/(app)/new-workout.tsx` oluştur:
```tsx
import { useState } from 'react'
import { Alert, Button, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useExercises, useCreateWorkout, type Exercise } from '../../lib/queries'

type DraftSet = { exercise_id: string; exercise_name: string; reps: number; weight_kg: number }

export default function NewWorkout() {
  const { data: exercises } = useExercises()
  const createWorkout = useCreateWorkout()
  const router = useRouter()
  const [sets, setSets] = useState<DraftSet[]>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  function addSet() {
    if (!selected || !reps) { Alert.alert('Eksik', 'Egzersiz ve tekrar gerekli'); return }
    setSets((prev) => [
      ...prev,
      { exercise_id: selected.id, exercise_name: selected.name, reps: Number(reps), weight_kg: Number(weight) || 0 },
    ])
    setReps(''); setWeight('')
  }

  function save() {
    if (sets.length === 0) { Alert.alert('Boş', 'En az bir set ekle'); return }
    const numbered = sets.map((s, i) => ({
      exercise_id: s.exercise_id, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg,
    }))
    createWorkout.mutate(
      { notes: null, sets: numbered },
      { onSuccess: () => router.replace('/(app)'), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Egzersiz seç:</Text>
      <FlatList
        horizontal
        data={exercises}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={{
              padding: 10, marginRight: 8, borderRadius: 8,
              backgroundColor: selected?.id === item.id ? '#2563eb' : '#eee',
            }}
          >
            <Text style={{ color: selected?.id === item.id ? '#fff' : '#000' }}>{item.name}</Text>
          </Pressable>
        )}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
        <TextInput placeholder="Tekrar" keyboardType="numeric" value={reps} onChangeText={setReps}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }} />
        <Button title="Set Ekle" onPress={addSet} />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={sets}
        keyExtractor={(_, i) => String(i)}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Henüz set eklenmedi.</Text>}
        renderItem={({ item, index }) => (
          <Text style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
            {index + 1}. {item.exercise_name} — {item.reps} tekrar × {item.weight_kg} kg
          </Text>
        )}
      />

      <Button title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'}
        onPress={save} disabled={createWorkout.isPending} />
    </View>
  )
}
```

- [ ] **Step 2: Test et**

Run: `cd mobile; npx expo start`. Ana ekran → "+ Yeni Antrenman" → bir egzersiz seç, tekrar+kilo gir, "Set Ekle" (birkaç set ekle) → "Antrenmanı Kaydet".
Expected: Ana ekrana döner ve yeni antrenman listede görünür. Studio → `workouts` ve `workout_sets`'te yeni satırları gör.

- [ ] **Step 3: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/new-workout.tsx"
git commit -m "feat(mobile): create new workout with sets"
```

---

### Task 18: Antrenman detay ekranı

**Files:**
- Create: `mobile/app/(app)/workout/[id].tsx`

- [ ] **Step 1: Ekranı yaz**

`mobile/app/(app)/workout/[id].tsx` oluştur:
```tsx
import { FlatList, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useWorkoutSets } from '../../../lib/queries'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Text style={{ padding: 24 }}>Yükleniyor...</Text>

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Antrenman Detayı</Text>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 16 }}>{item.set_number}. {item.exercise.name}</Text>
            <Text style={{ color: '#666' }}>{item.reps} tekrar × {item.weight_kg} kg</Text>
          </View>
        )}
      />
    </View>
  )
}
```

- [ ] **Step 2: Test et**

Run: `cd mobile; npx expo start`. Ana ekranda bir antrenmana dokun.
Expected: O seansın tüm setleri egzersiz adıyla birlikte listelenir.

- [ ] **Step 3: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/workout"
git commit -m "feat(mobile): workout detail screen"
```

---

### Task 19: Profil ekranı + çıkış

**Files:**
- Create: `mobile/app/(app)/profile.tsx`

- [ ] **Step 1: Ekranı yaz**

`mobile/app/(app)/profile.tsx` oluştur:
```tsx
import { useEffect, useState } from 'react'
import { Button, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

export default function Profile() {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('display_name').eq('id', session!.user.id).single()
      .then(({ data }) => setDisplayName(data?.display_name ?? null))
  }, [session])

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Profil</Text>
      <Text>Ad: {displayName ?? '...'}</Text>
      <Text>E-posta: {session?.user.email}</Text>
      <Button title="Çıkış Yap" onPress={() => supabase.auth.signOut()} />
    </View>
  )
}
```

- [ ] **Step 2: Test et**

Run: `cd mobile; npx expo start`. "Profil" sekmesi.
Expected: Ad ve e-posta görünür. "Çıkış Yap" → login ekranına döner (auth guard çalışır).

- [ ] **Step 3: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/app/(app)/profile.tsx"
git commit -m "feat(mobile): profile screen with sign out"
```

---

# BÖLÜM 7 — Uçtan Uca Test & RLS Doğrulaması

### Task 20: İki kullanıcıyla RLS izolasyon testi

**Files:** (yok — manuel doğrulama)

- [ ] **Step 1: Birinci kullanıcının verisini oluştur**

Uygulamada `user1@test.com` ile kayıt ol/giriş yap, bir antrenman kaydet, çıkış yap.

- [ ] **Step 2: İkinci kullanıcıyla kontrol et**

`user2@test.com` ile kayıt ol/giriş yap, ana ekrana bak.
Expected: **Boş** — user2, user1'in antrenmanını GÖRMEZ. (RLS çalışıyor.)

- [ ] **Step 3: Egzersiz görünürlüğünü doğrula**

user2 ile "Egzersizler" sekmesi.
Expected: 32 hazır egzersiz görünür, ama user1'in eklediği özel egzersiz (⭐) **görünmez**.

- [ ] **Step 4: SQL ile çift kontrol (Studio SQL Editor)**

Studio → SQL Editor'da çalıştır:
```sql
select count(*) from public.workouts;
```
Expected: Bu sorgu `service_role` ile çalıştığı için TÜM kullanıcıların toplamını gösterir (örn. 1). Bu, verinin DB'de var olduğunu ama RLS'in istemci tarafında filtrelediğini kanıtlar.

---

### Task 21: README — kurulum ve çalıştırma notları

**Files:**
- Create: `README.md`

- [ ] **Step 1: README yaz**

Proje kökünde `README.md` oluştur:
```markdown
# Fitness App (Aşama 1)

Supabase (yerel/Docker) backend + Expo (React Native) mobil uygulama.

## Çalıştırma

### Backend
\`\`\`powershell
supabase start          # yerel Supabase'i başlat (Docker gerekli)
supabase status         # URL ve anahtarları gör
supabase db reset       # migration + seed'i yeniden uygula
supabase stop           # durdur
\`\`\`

### Mobil
\`\`\`powershell
cd mobile
npx expo start          # Metro başlat, Expo Go ile QR okut
\`\`\`

## Ortam değişkenleri
- Kök `.env.local`: Google OAuth gizli anahtarları (commit edilmez)
- `mobile/.env`: \`EXPO_PUBLIC_SUPABASE_URL\` (LAN IP) + \`EXPO_PUBLIC_SUPABASE_ANON_KEY\`

## Mimari
- `supabase/migrations` — şema + RLS
- `supabase/seed.sql` — hazır egzersizler
- `mobile/app` — Expo Router ekranları
- `mobile/lib` — supabase istemcisi, auth context, query hook'ları
```

- [ ] **Step 2: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add README.md
git commit -m "docs: add setup and run instructions"
```

---

# BÖLÜM 8 — Sonraki Adımlar (Aşama 2'ye köprü)

Aşama 1 tamamlandığında elinde çalışan bir temel olacak. Aşama 2 (Beslenme & Kalori) için ileride yapılacaklar:

- **Yeni tablolar:** `foods` (besin veritabanı), `meals`, `meal_items` — aynı RLS deseniyle.
- **Yeni ekranlar:** öğün girişi, günlük kalori/makro özeti.
- **Cloud'a geçiş (opsiyonel):** `supabase link --project-ref <ref>` + `supabase db push` ile şemayı bulut projeye taşıma; `mobile/.env`'i cloud URL/anahtarla güncelleme.

Aşama 2'ye geçtiğimizde yeni bir spec → plan → uygulama döngüsü başlatacağız.

---

## Plan Öz-Değerlendirmesi (yazar kontrolü)

- **Spec kapsamı:** Spec'in 9 bölümünün tamamı plana eşlendi — tech stack (Task 9/11/13), şema (Task 3), RLS (Task 3/20), trigger (Task 4), seed (Task 5), Google OAuth (Task 6-7, 12), Expo kurulumu (Task 8-9), 6 ekran (Task 15-19), auth (Task 10-12), test & başarı kriterleri (Task 20). ✅
- **Placeholder taraması:** "TBD"/"TODO"/"uygun hata yönetimi ekle" gibi ifade yok; her kod adımı tam kod içeriyor. ✅
- **Tip tutarlılığı:** `queries.ts`'te tanımlanan `Exercise`, `Workout`, `WorkoutSet` tipleri ve hook isimleri (`useExercises`, `useAddExercise`, `useWorkouts`, `useWorkoutSets`, `useCreateWorkout`) sonraki ekranlarda birebir aynı kullanıldı. ✅
- **Başarı kriterleri:** Spec'teki 7 başarı kriterinin her biri ilgili task'ların test adımlarıyla doğrulanıyor. ✅
