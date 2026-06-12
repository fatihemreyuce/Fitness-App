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
