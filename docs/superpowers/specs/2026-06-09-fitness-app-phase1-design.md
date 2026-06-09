# Fitness Uygulaması — Aşama 1 Tasarımı (Temel + Antrenman Takibi)

**Tarih:** 2026-06-09
**Durum:** Onaylandı (brainstorming)
**Kapsam:** Aşama 1 / 3

---

## 1. Genel Bakış

Hepsi-bir-arada bir fitness uygulamasının ilk aşaması. Bu aşama, tüm projenin
**temelini** atar: Supabase backend (yerel, Docker ile), kullanıcı girişi (Auth),
güvenlik (RLS) ve tam çalışan bir **antrenman takibi** (workout logger).

Proje hem öğrenme hem de gerçek bir ürün (MVP) hedefiyle ilerler. Bu nedenle her
adım "neden böyle yapıyoruz" açıklamasıyla, ama aynı zamanda production'a uygun
pratiklerle (migration'lar, RLS, ortam değişkenleri) anlatılır.

### Yol Haritası (tüm milestone'lar)

1. **Aşama 1 — Temel + Antrenman Takibi** ← *bu doküman*
2. Aşama 2 — Beslenme & Kalori takibi
3. Aşama 3 — İlerleme & İstatistik (grafikler, hedefler, dashboard)

Her aşama kendi spec → plan → uygulama döngüsüne sahiptir.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji | Gerekçe |
|---|---|---|
| Backend | Supabase (Postgres + Auth + RLS) | CLI ile yönetilir |
| Yerel çalıştırma | Supabase CLI + **Docker** | Yerelde tam Supabase stack'i |
| Şema yönetimi | Migration dosyaları (`supabase/migrations`) | Versiyonlanabilir, tekrarlanabilir |
| Mobil | React Native + **Expo** (TypeScript) | Tek kod tabanı → iOS + Android |
| Navigasyon | **Expo Router** (dosya tabanlı) | Modern, öğrenmesi kolay |
| Sunucu verisi | TanStack Query (React Query) | Veri çekme + önbellek standardı |
| Auth istemcisi | `@supabase/supabase-js` + AsyncStorage | Oturumun mobilde kalıcılığı |

---

## 3. Veritabanı Şeması

Beş tablo. Tümü `public` şemasında; `profiles` Supabase'in `auth.users`'ını genişletir.

### `profiles`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | `auth.users.id`'ye FK |
| display_name | text | |
| avatar_url | text | nullable |
| created_at | timestamptz | default now() |

### `exercises`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | |
| name | text | örn. "Bench Press" |
| muscle_group | text | örn. "chest", "legs" |
| equipment | text | nullable, örn. "barbell" |
| owner_id | uuid | **NULL = herkese açık (hazır)**, dolu = kullanıcının özel egzersizi |
| created_at | timestamptz | default now() |

### `workouts`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | FK → auth.users |
| started_at | timestamptz | default now() |
| ended_at | timestamptz | nullable |
| notes | text | nullable |

### `workout_sets`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | |
| workout_id | uuid | FK → workouts (on delete cascade) |
| exercise_id | uuid | FK → exercises |
| set_number | int | seans içinde set sırası |
| reps | int | tekrar sayısı |
| weight_kg | numeric | kaldırılan kilo |
| created_at | timestamptz | default now() |

### İlişkiler
- Bir **workout** → birçok **workout_set** (cascade delete).
- Her **workout_set** → bir **exercise**.
- Egzersizler: `owner_id IS NULL` → hazır kütüphane; `owner_id = uid` → özel.

---

## 4. Güvenlik (RLS)

Tüm tablolarda RLS **açık**. Politikalar:

- **profiles**: kullanıcı yalnızca kendi satırını okur/günceller (`id = auth.uid()`).
- **workouts**: tam sahiplik — sadece `user_id = auth.uid()` olan satırlar (select/insert/update/delete).
- **workout_sets**: ilgili workout'un sahibiyse erişim (workout üzerinden kontrol).
- **exercises**:
  - SELECT: `owner_id IS NULL OR owner_id = auth.uid()` (herkese açık + kendi özel egzersizleri).
  - INSERT/UPDATE/DELETE: yalnızca `owner_id = auth.uid()` (hazır egzersizler değiştirilemez).

### Trigger
- `auth.users`'a yeni kayıt eklendiğinde otomatik bir `profiles` satırı oluşturan
  `handle_new_user()` trigger fonksiyonu.

### Seed Data
- ~30-50 popüler egzersiz (`owner_id = NULL`) `supabase/seed.sql` ile yüklenir.

---

## 5. Kimlik Doğrulama (Auth) Akışı

İki yöntem, ilk aşamada birlikte:

1. **E-posta + Şifre**
   - Kayıt → (yerel geliştirmede e-posta doğrulama Inbucket ile test edilir) → giriş.
   - Supabase'in hazır `signUp` / `signInWithPassword` akışı.

2. **Google ile Giriş (OAuth)**
   - Google Cloud Console'da OAuth client oluşturma.
   - Supabase Auth → Google provider yapılandırması.
   - Mobilde **deep-link** kurulumu: `expo-linking` + uygulama `scheme`'i + redirect URL.

Oturum, `AsyncStorage` ile cihazda kalıcı tutulur; uygulama açılışında geri yüklenir.

---

## 6. Mobil Ekranlar (Expo Router yapısı)

```
app/
  (auth)/
    login.tsx          # Giriş (e-posta/şifre + Google)
    signup.tsx         # Kayıt
  (app)/
    index.tsx          # Ana sayfa / Antrenman geçmişi
    new-workout.tsx    # Yeni antrenman: egzersiz seç, set ekle, kaydet
    workout/[id].tsx   # Antrenman detayı (seansın tüm setleri)
    exercises.tsx      # Egzersiz kütüphanesi + özel egzersiz ekle
    profile.tsx        # Profil + çıkış
  _layout.tsx          # Oturum kontrolü, yönlendirme (auth guard)
```

### Veri Akışı
- Tüm Supabase çağrıları TanStack Query üzerinden (`useQuery` / `useMutation`).
- Auth durumu bir `AuthContext` / `useAuth` hook ile global yönetilir.
- `_layout.tsx`: oturum yoksa `(auth)`, varsa `(app)` grubuna yönlendirir.

---

## 7. Dökümantasyon / Uygulama Planı Yapısı

Asıl teslimat: adım adım, açıklamalı, kopyala-çalıştır komutlu rehber.

1. **Ön gereksinimler** — Node (LTS), Git, Docker Desktop, Expo, Supabase CLI kurulumu (Windows).
2. **Supabase backend** — `supabase init`, `supabase start`, migration'larla şema + RLS + trigger, `seed.sql`.
3. **Google OAuth** — Google Cloud yapılandırması + Supabase'e bağlama + redirect URL'ler.
4. **Expo projesi** — kurulum, Expo Router, klasör yapısı, Supabase istemcisi, `.env` ortam değişkenleri.
5. **Auth ekranları** — giriş/kayıt/Google + oturum yönetimi + auth guard.
6. **Antrenman özellikleri** — egzersiz kütüphanesi, yeni antrenman, geçmiş, detay ekranları.
7. **Test & çalıştırma** — Expo Go / emülatör, yerel Supabase'e bağlanma, uçtan uca deneme.
8. **Sonraki adımlar** — Aşama 2'ye (beslenme) köprü, cloud Supabase'e deploy notları.

---

## 8. Kapsam Dışı (YAGNI — Aşama 1'de yok)

- Beslenme / kalori takibi (Aşama 2)
- Grafikler / istatistik / hedefler (Aşama 3)
- Sosyal özellikler, arkadaş ekleme, paylaşım
- Push bildirimleri
- Antrenman şablonları / program oluşturma
- Cloud'a deploy (yerelde tamamlanır; köprü notu olarak değinilir)

---

## 9. Başarı Kriterleri (Aşama 1)

- [ ] Yerel Supabase Docker ile çalışıyor; şema migration'larla kuruluyor.
- [ ] Kullanıcı e-posta/şifre **ve** Google ile kayıt olup giriş yapabiliyor.
- [ ] RLS aktif: bir kullanıcı başkasının verisini göremiyor (test edildi).
- [ ] Hazır egzersiz kütüphanesi yükleniyor; kullanıcı özel egzersiz ekleyebiliyor.
- [ ] Kullanıcı yeni antrenman oluşturup set/tekrar/kilo girip kaydedebiliyor.
- [ ] Geçmiş antrenmanlar listeleniyor ve detayı görüntülenebiliyor.
- [ ] Uygulama Expo ile gerçek cihazda/emülatörde çalışıyor.
