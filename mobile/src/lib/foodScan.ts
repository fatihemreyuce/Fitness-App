// mobile/src/lib/foodScan.ts
// Edge Function 'yemek-analiz-et' yanıt şekli (porsiyon başına değerler).
export type ScanResult = {
  yemek_adi: string | null
  porsiyon_gram: number
  kalori: number
  protein: number
  karbonhidrat: number
  yag: number
  guven: number // 0-1 AI güven skoru (etiket okumada yüksek, tahminde değişken)
  olcu_birimi: string // doğal ev ölçüsü: "kase", "dilim", "tabak", "adet", "avuç"...
  birim_gram: number // 1 ölçü biriminin tahmini gramı
}

// foods tablosunun 100g-başına şeması.
export type Per100g = {
  calories_per_100g: number
  protein_g: number
  carb_g: number
  fat_g: number
}

// Porsiyon-başına makroları 100g-başına çevirir. Negatif/0 porsiyon guard'lı.
export function portionToPer100g(r: {
  kalori: number; protein: number; karbonhidrat: number; yag: number; porsiyon_gram: number
}): Per100g {
  const g = r.porsiyon_gram > 0 ? r.porsiyon_gram : 1
  const k = 100 / g
  return {
    calories_per_100g: Math.max(0, Math.round(r.kalori * k)),
    protein_g: Math.max(0, Math.round(r.protein * k)),
    carb_g: Math.max(0, Math.round(r.karbonhidrat * k)),
    fat_g: Math.max(0, Math.round(r.yag * k)),
  }
}
