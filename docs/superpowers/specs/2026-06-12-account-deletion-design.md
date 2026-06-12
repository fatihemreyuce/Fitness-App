# Hesap Silme (Account Deletion) — Tasarım Spec'i

**Tarih:** 2026-06-12
**Durum:** Tasarım onaylandı (kullanıcı), implementasyona hazır
**Bağlam:** Code-review bulgusu #8 (profiles DELETE politikası yok / KVKK). Kullanıcının kendi hesabını ve tüm verisini kalıcı silebilmesi.

---

## Amaç

Kullanıcı, uygulama içinden hesabını **kalıcı ve geri alınamaz** şekilde silebilsin. Silme; auth kaydını ve tüm kişisel verisini (antrenman, besin, kilo, şablon, özel egzersiz, profil) kapsar. "Unutulma hakkı" / KVKK uyumu.

**Kapsam dışı (YAGNI):** veri export, soft-delete / "düşünme süresi", yeniden aktifleştirme, e-posta ile silme onayı, admin paneli. Sadece anında kalıcı silme.

---

## Anahtar Keşif: Cascade her şeyi siliyor

Şemadaki tüm kullanıcı verisi tabloları `auth.users(id)`'ye `ON DELETE CASCADE` ile bağlı:

- `profiles.id → auth.users(id) ON DELETE CASCADE`
- `exercises.owner_id → auth.users(id) ON DELETE CASCADE`
- `workouts.user_id → auth.users(id) ON DELETE CASCADE`
- `workout_sets.workout_id → workouts(id) ON DELETE CASCADE` (transitif)
- `food_entries`, `foods.owner_id`, `body_weights.user_id`, `workout_templates.user_id`, `workout_template_sets.template_id` — aynı desen (CASCADE)

**Sonuç:** `auth.users`'tan tek satırı silmek → tüm veri otomatik cascade ile gider. Tek tek tablo silmeye gerek yok.

---

## Mekanizma: SECURITY DEFINER RPC

**Seçilen yaklaşım (A).** Postgres `public.delete_account()` fonksiyonu, definer yetkisiyle çalışıp oturumdaki kullanıcının `auth.users` satırını siler. Client `supabase.rpc('delete_account')` ile çağırır.

**Neden bu (Edge Function yerine):** Projenin mevcut iş akışına uyuyor — sadece bir migration daha (dashboard SQL editor'de uygulanır, diğerleri gibi). Yeni altyapı yok (Deno / `functions deploy` / secret). Client tarafı tamamen OTA-safe (JS).

### Migration: `supabase/migrations/<ts>_add_account_deletion.sql`

```sql
-- Oturumdaki kullanıcının hesabını siler; cascade ile tüm verisi gider.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Yalnız giriş yapmış kullanıcı çağırabilsin
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Code-review #8: tamlık için açık DELETE politikası
-- (cascade zaten hallediyor ama profiles'ta diğer CRUD politikalarıyla simetri)
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);
```

**Güvenlik notları:**
- `security definer` + `set search_path = ''` → şema enjeksiyonu yok; `auth.users` ve `auth.uid()` tam nitelikli.
- Fonksiyon yalnız `auth.uid()`'yi (JWT'den) siler → bir kullanıcı başkasının hesabını silemez. Parametre yok.
- `authenticated` rolüne execute; `anon`/`public` revoke.

---

## Veri Katmanı: `useDeleteAccount()` (queries.ts)

```ts
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_account')
      if (error) throw error
    },
    onSuccess: async () => {
      await supabase.auth.signOut()  // local oturumu temizle
      qc.clear()                     // tüm cache'i boşalt
    },
  })
}
```

- Başarıda `signOut()` → `_layout`'taki auth guard kullanıcıyı giriş ekranına yönlendirir.
- `qc.clear()` → bir sonraki kullanıcı için stale veri kalmaz.

---

## UI: Profil ekranı "Tehlikeli Bölge" + onay modal'ı

**Yer:** `profile.tsx` en altı, "Çıkış Yap"ın altında.

### Tehlikeli Bölge bloğu
- Üstte ayraç (`colors.border`, `marginVertical`).
- Küçük uppercase kırmızı etiket: **"⚠ TEHLİKELİ BÖLGE"** (`colors.danger`).
- Kırmızı kenarlıklı (outline) buton: **"🗑 Hesabı Sil"** (`colors.danger` border + text).
- Altında ince ipucu: "Hesabını ve tüm verilerini kalıcı siler" (`textMuted`).

### Onay Modal'ı (yaz-ile-onayla)
React Native `Modal` (app'in mevcut modal desenine uygun — bkz. workout detay "şablon kaydet" modalı).

- Kırmızı daire içinde uyarı ikonu (`rgba(danger,.14)` arka plan).
- Başlık: **"Hesabı Sil"**.
- Gövde: *"Bu işlem geri alınamaz. Tüm antrenman, besin ve kilo kayıtların kalıcı olarak silinir."*
- Etiket: *"Onaylamak için **SİL** yaz"*.
- `Input` (focus'ta lime border — design-audit #3 ile uyumlu).
- İki buton satırı: **"Vazgeç"** (ghost) + **"Hesabı Sil"** (kırmızı dolu).
- **"Hesabı Sil" butonu yalnız input değeri tam olarak `SİL` iken aktif** (case-sensitive eşleşme; baş/son boşluk trim'lenir). Aksi halde `disabled` + soluk.
- Silme sürerken buton "Siliniyor..." + disabled.

### Akış
1. "Hesabı Sil" → modal açılır, input boş, onay butonu disabled.
2. Kullanıcı `SİL` yazar → onay butonu aktifleşir.
3. Onayda → `useDeleteAccount().mutate()`.
4. Başarı → `signOut()` + `qc.clear()` → auth ekranı (otomatik, `_layout` guard).
5. Hata → modal açık kalır, `Alert.alert('Hata', ...)` ile mesaj; kullanıcı tekrar deneyebilir/vazgeçebilir.

---

## Onay kelimesi
`SİL` (Türkçe, basit, lokalize). E-posta yazdırma alternatifi değerlendirildi → fazla sürtünme, tek-kullanıcılık app için gereksiz. `SİL` yeterli koruma.

---

## Test / Doğrulama
- Proje test harness'ı yok → `npx tsc --noEmit` yeşil + manuel cihaz testi.
- Manuel: (a) `SİL` yazmadan buton pasif mi; (b) yanlış kelime → pasif; (c) doğru kelime → silme → giriş ekranına dönüş; (d) silinen kullanıcıyla tekrar giriş denenince hesap yok.
- **Migration ÖNCE uygulanmalı** (Supabase dashboard / `supabase db push`), sonra client OTA.

---

## Kullanıcı manuel adımları (Task sonu)
1. Migration'ı Supabase'e uygula (dashboard proje `basgwbnidemhmxvwpqpb` SQL Editor veya `supabase db push`).
2. `cd mobile && eas update --branch preview --platform android` (DİKKAT: `mobile/.env`'de 3 anahtar olmalı — SUPABASE url+anon + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — yoksa OTA Google girişini bozar).
3. Cihazda silme akışını test et.
