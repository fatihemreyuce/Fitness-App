# Fitness Uygulaması — Aşama 2 Tasarımı (Beslenme & Kalori + Tasarım Sistemi)

**Tarih:** 2026-06-09
**Durum:** Onaylandı (brainstorming)
**Kapsam:** Aşama 2 / 3

---

## 1. Genel Bakış

Aşama 1 (antrenman takibi) tamamlandı ve bulut Supabase + EAS APK ile gerçek
cihazda çalışıyor. Aşama 2 iki şey getirir:

1. **Beslenme & kalori takibi** — hazır besin veritabanı, öğün bazlı günlük
   günlük (diary), kalori/makro hesabı ve hedef takibi.
2. **Tasarım sistemi** — tüm uygulamayı tutarlı, modern, koyu temalı ("B stili":
   koyu zemin + neon lime vurgu) bir görünüme kavuşturur.

Backend zaten **bulut Supabase** projesinde (ref `basgwbnidemhmxvwpqpb`). Yeni
tablolar hem yerel migration olarak hem de bulut SQL Editöründe uygulanacak.
Uygulama EAS APK olarak dağıtılıyor; Aşama 2 bitince yeni bir APK derlenecek.

---

## 2. Veri Modeli

İki yeni tablo + `profiles` genişletmesi. Hepsi `public` şemasında, RLS açık.

### `foods`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | default gen_random_uuid() |
| name | text not null | örn. "Tavuk Göğsü (ızgara)" |
| brand | text | nullable |
| calories_per_100g | numeric not null | 100g başına kcal |
| protein_g | numeric not null default 0 | 100g başına |
| carb_g | numeric not null default 0 | 100g başına |
| fat_g | numeric not null default 0 | 100g başına |
| owner_id | uuid | **NULL = herkese açık (hazır)**, dolu = kullanıcının özel besini |
| created_at | timestamptz not null default now() | |

### `food_entries`
| Kolon | Tip | Not |
|---|---|---|
| id | uuid (PK) | default gen_random_uuid() |
| user_id | uuid not null | FK → auth.users (on delete cascade) |
| entry_date | date not null | hangi gün |
| meal_type | text not null | `breakfast` / `lunch` / `dinner` / `snack` (CHECK ile sınırlı) |
| food_id | uuid not null | FK → foods |
| quantity_g | numeric not null | CHECK > 0 |
| created_at | timestamptz not null default now() | |

### `profiles` (mevcut tabloya eklenecek kolonlar)
| Kolon | Tip | Not |
|---|---|---|
| daily_calorie_goal | int | nullable, kullanıcı Profil'den belirler |
| daily_protein_goal | int | nullable |

### Hesaplama
- Bir entry'nin kalorisi = `food.calories_per_100g * quantity_g / 100` (makrolar aynı şekilde).
- Günlük toplam = o `entry_date` için tüm entry'lerin toplamı (istemcide JS'te hesaplanır; `food_entries` ilgili `foods` ile join'lenerek çekilir).
- Egzersiz/antrenman desenindeki "hazır + kullanıcı özel" (owner_id) ve "kullanıcıya ait kayıt" (user_id) mantığının birebir aynısı.

---

## 3. Güvenlik (RLS)

- **foods**:
  - SELECT: `owner_id is null or owner_id = auth.uid()` (hazır + kendi özel besinleri)
  - INSERT/UPDATE/DELETE: yalnızca `owner_id = auth.uid()` (hazır besinler değiştirilemez), UPDATE'te `with check` da owner_id korur.
- **food_entries**: tam sahiplik — tüm işlemler `user_id = auth.uid()`; UPDATE'te `using` + `with check`.
- **food_entries.food_id**: INSERT/UPDATE `with check`'inde, referans verilen besinin kullanıcıya görünür olması (`owner_id is null or owner_id = auth.uid()`) şartı — Aşama 1'deki `workout_sets`→`exercises` görünürlük kontrolüyle aynı.
- **profiles**: mevcut politikalar yeterli (kendi satırını select/update); yeni kolonlar ek politika gerektirmez.

---

## 4. Ekranlar (Expo Router, `src/app/(app)/`)

### Yeni
- **`nutrition.tsx` — Beslenme / Bugün:** tarih seçici (◀ Bugün ▶), kalori özeti (hedefe göre ilerleme çubuğu + kalan), makro özeti (protein/karb/yağ), **Kahvaltı / Öğle / Akşam / Ara** grupları; her grup kendi entry'lerini ve toplamını gösterir, "+ Ekle" ile besin eklemeye gider.
- **`add-food.tsx` — Besin Ekle:** arama kutusu (hazır + özel besinler), sonuç listesi, seçilen besin için **miktar (g)** girişi → anlık kalori/makro önizleme → "{Öğün}'e Ekle". Ayrıca "Özel besin oluştur" girişi.
- **`new-food.tsx` — Özel Besin Oluştur:** ad + 100g makroları formu; `owner_id = kullanıcı` ile kaydeder.

### Güncellenecek
- **`profile.tsx`:** kalori ve protein **hedefi** ayarı (sayı girişi, kaydet).
- **`(app)/_layout.tsx`:** sekmelere **Beslenme** eklenir.

### Navigasyon
Sekme çubuğu: **Antrenmanlar · Egzersizler · Beslenme · Profil**. `add-food` ve `new-food` sekmede gizli (stack ile açılır).

---

## 5. Tasarım Sistemi (tüm uygulamayı yeniler)

"B stili" — koyu zemin (`#0d0f12` / kart `#16191f`), neon lime vurgu (`#c8ff00`),
beyaz/gri metin, büyük kalın rakamlar, yuvarlatılmış kartlar (12-16px).

### Yeni yapı
- **`src/theme/index.ts`** — `colors`, `spacing`, `radius`, `typography` sabitleri (tek kaynak).
- **`src/components/ui/`** — yeniden kullanılabilir bileşenler:
  - `Screen` (koyu güvenli alan + padding), `Card`, `Button` (primary=lime / ghost), `Input`, `Text` (varyantlar: title/body/label/stat), `ProgressBar`, `StatChip`.

### Refactor
- Mevcut ekranlar (antrenman ana/yeni/detay, egzersizler, giriş, kayıt, profil) inline stillerden bu bileşenlere taşınır. **Mantık/davranış aynı kalır; yalnızca görünüm değişir.** Her ekran kendi commit'inde, çalışır halde bırakılır.

---

## 6. Seed Verisi

~80-100 yaygın besin, `owner_id = NULL`, 100g makrolarıyla. Türk mutfağından örnekler
dahil: yulaf, yumurta, tavuk göğsü, pirinç (pişmiş), bulgur, mercimek, kuru fasulye,
yoğurt, süt, peynir (beyaz/kaşar), ekmek, makarna, muz, elma, badem, zeytinyağı,
ton balığı, dana kıyma, somon vb. Hem yerel `supabase/seed.sql`'e hem de bulut SQL
kurulum scriptine eklenir.

---

## 7. Kapsam Dışı (YAGNI — Aşama 2'de yok)

- Barkod tarama / fotoğraftan besin tanıma
- Su takibi
- Kilo/boy/aktiviteden otomatik hedef (TDEE) hesaplama
- Haftalık/aylık grafikler ve raporlar (Aşama 3)
- Öğün şablonları / favori öğünler / tarif
- Google OAuth (hâlâ ertelenmiş ayrı iş)

---

## 8. Başarı Kriterleri (Aşama 2)

- [ ] Yeni tablolar (`foods`, `food_entries`) + profil hedef kolonları hem yerelde hem bulutta kurulu; RLS aktif ve izolasyon doğru.
- [ ] ~80-100 hazır besin yüklü; kullanıcı arama yapıp seçebiliyor.
- [ ] Kullanıcı özel besin ekleyebiliyor (yalnızca kendisi görüyor).
- [ ] Kullanıcı bir besini miktarla birlikte bir öğüne (Kahvaltı/Öğle/Akşam/Ara) ekleyebiliyor; kalori/makro doğru hesaplanıyor.
- [ ] Beslenme/Bugün ekranı günlük toplamları ve hedefe göre ilerlemeyi doğru gösteriyor; tarih değiştirilebiliyor.
- [ ] Kullanıcı Profil'den kalori/protein hedefini ayarlayabiliyor.
- [ ] Tüm uygulama (antrenman + auth + profil + beslenme) tutarlı B stili (koyu + lime) tasarım sistemini kullanıyor.
- [ ] Yeni EAS APK derlenip cihazda uçtan uca çalışıyor.
