// supabase/functions/yemek-analiz-et/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PROMPT =
  "Görseli analiz et ve ADIM ADIM düşün:\n" +
  "1) Görseldeki yemeği veya ürünü tanı.\n" +
  "2) Eğer görselde bir BESİN DEĞERLERİ TABLOSU / ürün etiketi varsa (paketli ürünün arkası), " +
  "değerleri tablodan BİREBİR oku, TAHMİN ETME. Tablo 100 gram başına ise porsiyon_gram=100 yap; " +
  "etikette bir porsiyon (serving) belirtilmişse porsiyon_gram'ı ona eşitle. guven=0.95. " +
  "yemek_adi = paketteki ürün adı.\n" +
  "3) Tablo yoksa TAHMİN et: önce tabağın/kasenin tahmini çapını ve yemeğin kabarıklığını değerlendir, " +
  "hacmi tahmin et, yemeğin yoğunluğundan gramı çıkar. Buna göre porsiyon_gram (görseldeki tahmini miktar) " +
  "ve o porsiyonun TOPLAM kalori/makrolarını hesapla. Tahmininin ne kadar emin olduğunu guven (0-1) ile " +
  "belirt: net görüntü ve tanıdık yemek → yüksek; bulanık, belirsiz porsiyon veya alışılmadık yemek → düşük.\n" +
  "4) Bu yemek için DOĞAL bir ev ölçüsü seç: olcu_birimi (\"kase\", \"tabak\", \"dilim\", \"adet\", \"avuç\", " +
  "\"bardak\", \"yemek kaşığı\", \"porsiyon\" gibi) ve BİR biriminin kaç gram olduğunu birim_gram olarak ver.\n" +
  "SADECE şu JSON'u döndür: {\"yemek_adi\": string, \"porsiyon_gram\": number, \"kalori\": number, " +
  "\"protein\": number, \"karbonhidrat\": number, \"yag\": number, \"guven\": number, " +
  "\"olcu_birimi\": string, \"birim_gram\": number}. " +
  "Ne yemek ne de besin tablosu tanınıyorsa yemek_adi alanını null yap."

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { imageBase64, mimeType } = await req.json().catch(() => ({}))
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 gerekli" }, 400)
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) return json({ error: "GEMINI_API_KEY tanımlı değil" }, 500)

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType ?? "image/jpeg", data: imageBase64 } },
              { text: PROMPT },
            ],
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    )
    if (!gemRes.ok) {
      console.error("Gemini error", gemRes.status, await gemRes.text())
      return json({ error: "AI servisi hatası" }, 502)
    }
    const data = await gemRes.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return json({ error: "AI boş yanıt" }, 502)

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(stripFence(text))
    } catch {
      console.error("JSON parse fail:", text)
      return json({ error: "AI yanıtı çözümlenemedi" }, 502)
    }
    if (parsed?.yemek_adi == null) return json({ yemek_adi: null }, 200)

    const porsiyon = num(parsed.porsiyon_gram, 100)
    return json({
      yemek_adi: String(parsed.yemek_adi),
      porsiyon_gram: porsiyon,
      kalori: num(parsed.kalori, 0),
      protein: num(parsed.protein, 0),
      karbonhidrat: num(parsed.karbonhidrat, 0),
      yag: num(parsed.yag, 0),
      guven: clamp01(parsed.guven),
      olcu_birimi: str(parsed.olcu_birimi, "porsiyon"),
      birim_gram: num(parsed.birim_gram, porsiyon > 0 ? porsiyon : 100),
    }, 200)
  } catch (e) {
    console.error("Unexpected", e)
    return json({ error: "Beklenmeyen hata" }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  })
}
function num(v: unknown, d: number) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}
function clamp01(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}
function str(v: unknown, d: string) {
  return typeof v === "string" && v.trim() ? v.trim() : d
}
function stripFence(s: string) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
}
