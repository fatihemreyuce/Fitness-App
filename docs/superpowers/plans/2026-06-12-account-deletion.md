# Hesap Silme (Account Deletion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı uygulama içinden hesabını ve tüm verisini kalıcı (geri alınamaz) silebilsin.

**Architecture:** Postgres `delete_account()` SECURITY DEFINER RPC, oturumdaki kullanıcının `auth.users` satırını siler; tüm veri `ON DELETE CASCADE` ile gider. Client `supabase.rpc('delete_account')` çağırır, başarıda `signOut()` + cache temizler. UI: profil altında "Tehlikeli Bölge" + yaz-ile-onayla modal.

**Tech Stack:** Supabase (Postgres + RLS), React Native + Expo, @tanstack/react-query, expo-router.

**Spec:** `docs/superpowers/specs/2026-06-12-account-deletion-design.md`

> **NOT — test harness yok:** Projede jest/unit test yok (CLAUDE.md/memory). Otomatik kapı = `npx tsc --noEmit` (mobile/ içinde). Her task'ın sonunda manuel doğrulama listesi var. DB tarafı cihaz/dashboard'da manuel doğrulanır.

---

## File Structure

| Dosya | Sorumluluk | İşlem |
|------|-----------|------|
| `supabase/migrations/20260612120000_add_account_deletion.sql` | `delete_account()` fonksiyonu + `profiles_delete_own` politikası | Create |
| `mobile/src/lib/queries.ts` | `useDeleteAccount()` mutation hook'u | Modify |
| `mobile/src/components/DeleteAccountSection.tsx` | "Tehlikeli Bölge" butonu + onay modal'ı + mutation tetikleme | Create |
| `mobile/src/app/(app)/profile.tsx` | `<DeleteAccountSection/>`'ı en alta yerleştir | Modify |

---

## Task 1: DB migration — `delete_account()` RPC + DELETE politikası

**Files:**
- Create: `supabase/migrations/20260612120000_add_account_deletion.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

`supabase/migrations/20260612120000_add_account_deletion.sql`:

```sql
-- Oturumdaki kullanıcının hesabını siler; ON DELETE CASCADE ile tüm verisi gider.
-- SECURITY DEFINER: auth.users üzerinde silme yetkisi için. search_path='' ile şema-enjeksiyonu kapalı.
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

-- Code-review #8: profiles için açık DELETE politikası (cascade zaten siler; CRUD simetrisi için)
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);
```

- [ ] **Step 2: SQL'i lokal/staging Supabase'de doğrula (manuel)**

`delete_account()` yalnız `auth.uid()`'yi sildiği için parametre yok → bir kullanıcı başkasını silemez. Doğrulama (Supabase SQL Editor, bir test kullanıcısıyla):
- `select public.delete_account();` çağrısı hata vermeden dönmeli.
- Çağrı sonrası o kullanıcının `auth.users`, `public.profiles`, `public.workouts`, `public.body_weights`, `public.food_entries` satırları gitmiş olmalı (cascade).
- `revoke`/`grant` sonrası `anon` rolüyle çağrı reddedilmeli.

> Bu adım otomatik test edilemez (auth.users'a dokunur). Gerçek doğrulama Task 4 sonrası cihazda yapılır. Migration ÖNCE uygulanmalı.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260612120000_add_account_deletion.sql
git commit -m "feat(db): delete_account() RPC + profiles DELETE policy"
```

---

## Task 2: `useDeleteAccount()` mutation hook'u

**Files:**
- Modify: `mobile/src/lib/queries.ts`

- [ ] **Step 1: Hook'u ekle**

`mobile/src/lib/queries.ts` dosyasının SONUNA ekle (mevcut `useUpdateTargetWeight`'ten sonra):

```ts
// ============ Hesap Silme ============
// delete_account() RPC oturumdaki auth.users satırını siler → cascade tüm veri.
// Başarıda local oturumu kapat + cache'i boşalt (sonraki kullanıcıya sızmasın).
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_account')
      if (error) throw error
    },
    onSuccess: async () => {
      await supabase.auth.signOut()
      qc.clear()
    },
  })
}
```

- [ ] **Step 2: tsc ile doğrula**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0 (hata yok). `supabase.rpc('delete_account')` tip hatası verirse, projedeki Supabase tipleri generic'tir (üretilmiş tip yok) → `rpc` string kabul eder, sorun olmaz.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/queries.ts
git commit -m "feat(queries): useDeleteAccount mutation (rpc + signOut + cache clear)"
```

---

## Task 3: `DeleteAccountSection` bileşeni (Tehlikeli Bölge + onay modal'ı)

**Files:**
- Create: `mobile/src/components/DeleteAccountSection.tsx`

- [ ] **Step 1: Bileşeni oluştur**

`mobile/src/components/DeleteAccountSection.tsx`:

```tsx
import { useState } from 'react'
import { Alert, Modal, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Input, Button } from './ui'
import { colors, spacing, radius } from '../theme'
import { useDeleteAccount } from '../lib/queries'

const CONFIRM_WORD = 'SİL'

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const deleteAccount = useDeleteAccount()

  // Türkçe locale ile büyük harfe çevir → 'sil' / 'Sil' / 'SİL' hepsi kabul (dotted-İ tuzağı).
  const canDelete = confirmText.trim().toLocaleUpperCase('tr') === CONFIRM_WORD

  function close() {
    if (deleteAccount.isPending) return
    setOpen(false)
    setConfirmText('')
  }

  function onConfirm() {
    if (!canDelete || deleteAccount.isPending) return
    deleteAccount.mutate(undefined, {
      onError: (e) => Alert.alert('Hata', 'Hesap silinemedi: ' + String((e as Error).message ?? e)),
      // Başarıda hook signOut + qc.clear() yapar; _layout auth guard giriş ekranına yönlendirir.
    })
  }

  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.lg }} />
      <Text variant="label" color={colors.danger} style={{ marginBottom: spacing.sm }}>⚠ TEHLİKELİ BÖLGE</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Hesabı sil"
        style={({ pressed }) => [
          { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: 13,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="trash-outline" size={17} color={colors.danger} />
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.danger }}>Hesabı Sil</Text>
      </Pressable>

      <Text variant="label" color={colors.textFaint} style={{ marginTop: spacing.sm }}>
        Hesabını ve tüm verilerini kalıcı olarak siler.
      </Text>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg }}
        >
          {/* iç tıklamayı yutarak overlay-kapanmayı engelle */}
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardAlt,
              borderRadius: radius.lg, padding: spacing.xl }}
          >
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,107,107,0.14)',
              alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md }}>
              <Ionicons name="warning" size={24} color={colors.danger} />
            </View>

            <Text variant="subtitle" style={{ textAlign: 'center', marginBottom: spacing.sm }}>Hesabı Sil</Text>
            <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center', marginBottom: spacing.lg }}>
              Bu işlem geri alınamaz. Tüm antrenman, besin ve kilo kayıtların kalıcı olarak silinir.
            </Text>

            <Text variant="label" style={{ marginBottom: spacing.xs }}>Onaylamak için SİL yaz</Text>
            <Input
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="SİL"
              editable={!deleteAccount.isPending}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button title="Vazgeç" variant="ghost" onPress={close} disabled={deleteAccount.isPending} style={{ flex: 1 }} />
              <Pressable
                onPress={onConfirm}
                disabled={!canDelete || deleteAccount.isPending}
                accessibilityRole="button"
                accessibilityLabel="Hesabı kalıcı olarak sil"
                style={({ pressed }) => [
                  { flex: 1, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center',
                    justifyContent: 'center', backgroundColor: colors.danger },
                  (!canDelete || deleteAccount.isPending) && { opacity: 0.4 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#fff' }}>
                  {deleteAccount.isPending ? 'Siliniyor...' : 'Hesabı Sil'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
```

> **API notları (doğrulanmış):** `Text` `variant`/`color`/`style` prop'larını kabul eder (profile.tsx'te kullanılıyor). `Button` `{ title, onPress, variant:'primary'|'ghost', disabled, loading, icon, style:ViewStyle }`. `Input` saf `TextInputProps` sarmalayıcısı. `colors.danger='#ff6b6b'`, `radius.lg=16`, `spacing.xl=24`. Kırmızı metin/buton için Button kullanılmadı (fg rengi sabit) → özel `Pressable`.

- [ ] **Step 2: tsc ile doğrula**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/DeleteAccountSection.tsx
git commit -m "feat(mobile): DeleteAccountSection — danger zone + type-to-confirm modal"
```

---

## Task 4: Profil ekranına yerleştir

**Files:**
- Modify: `mobile/src/app/(app)/profile.tsx`

- [ ] **Step 1: Import ekle**

`mobile/src/app/(app)/profile.tsx` import bloğuna ekle (diğer component import'larının yanına):

```ts
import { DeleteAccountSection } from '../../components/DeleteAccountSection'
```

- [ ] **Step 2: "Çıkış Yap" butonunun ALTINA yerleştir**

`profile.tsx` içinde mevcut satır:

```tsx
      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </Screen>
```

şununla değiştir:

```tsx
      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />

      <DeleteAccountSection />
    </Screen>
```

- [ ] **Step 3: tsc ile doğrula**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(app)/profile.tsx
git commit -m "feat(mobile): mount DeleteAccountSection on profile screen"
```

---

## Final: Manuel doğrulama (cihaz) + yayın

Migration ÖNCE uygulanmalı, sonra OTA. Bu adımlar **kullanıcı** tarafından yapılır (spec'teki manuel adımlar):

1. Migration'ı Supabase'e uygula (dashboard proje `basgwbnidemhmxvwpqpb` SQL Editor veya `supabase db push`).
2. `cd mobile && eas update --branch preview --platform android` (`mobile/.env`'de 3 anahtar olmalı — SUPABASE url+anon + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
3. Cihazda test:
   - [ ] Profil altında "⚠ Tehlikeli Bölge" + kırmızı "Hesabı Sil" görünür.
   - [ ] Modal açılır; input boşken "Hesabı Sil" butonu pasif/soluk.
   - [ ] Yanlış kelime (örn. "xx") → buton pasif kalır.
   - [ ] `SİL` (veya `sil`) yazınca buton aktifleşir.
   - [ ] Onayda → "Siliniyor..." → otomatik çıkış → giriş ekranı.
   - [ ] Silinen hesapla tekrar giriş denemesi başarısız (hesap yok).
   - [ ] Overlay'e dokununca / "Vazgeç" ile modal kapanır, veri silinmez.

---

## Self-Review (yazım sonrası)

- **Spec kapsamı:** Mekanizma (Task 1) ✓, veri katmanı (Task 2) ✓, UI danger zone + modal + yaz-ile-onayla (Task 3) ✓, profile yerleşimi (Task 4) ✓, hata akışı (onError Alert) ✓, başarı akışı (signOut+clear+guard) ✓, manuel adımlar ✓. Kapsam dışı (export/soft-delete) plana sızmadı ✓.
- **Placeholder taraması:** Yok — her step tam kod/komut içeriyor.
- **Tip tutarlılığı:** `useDeleteAccount` (Task 2) ↔ `DeleteAccountSection` (Task 3) imzaları uyumlu; `mutate(undefined, {onError})` mutation `mutationFn: async () => void` ile uyumlu. `CONFIRM_WORD='SİL'` ↔ `toLocaleUpperCase('tr')` karşılaştırması tutarlı.
