// supabase/functions/yemek-analiz-et/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PROMPT =
  "Bu görseldeki yemeği analiz et. Tahmini porsiyonu gram cinsinden ver ve o porsiyonun " +
  "TOPLAM kalori ve makrolarını hesapla. SADECE şu alanlara sahip bir JSON döndür: " +
  "yemek_adi (string), porsiyon_gram (number), kalori (number), protein (number), " +
  "karbonhidrat (number), yag (number). Görselde tanınır bir yemek yoksa yemek_adi alanını null yap."

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

    return json({
      yemek_adi: String(parsed.yemek_adi),
      porsiyon_gram: num(parsed.porsiyon_gram, 100),
      kalori: num(parsed.kalori, 0),
      protein: num(parsed.protein, 0),
      karbonhidrat: num(parsed.karbonhidrat, 0),
      yag: num(parsed.yag, 0),
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
function stripFence(s: string) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
}
