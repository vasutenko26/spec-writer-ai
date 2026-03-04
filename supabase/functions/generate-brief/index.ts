import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, language, region, contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langMap: Record<string, string> = { uk: "українською", ru: "на русском", en: "in English" };
    const typeMap: Record<string, string> = { article: "статтю/article", landing: "лендінг", product: "картку товару", category: "сторінку категорії" };
    const regionMap: Record<string, string> = { ua: "Україна", us: "USA", eu: "Europe" };

    const systemPrompt = `Ти — досвідчений SEO-спеціаліст. Створюєш детальні технічні завдання (бриф/ТЗ) для копірайтерів на основі аналізу пошукової видачі.
Відповідай ${langMap[language] || "українською"}.
Формат відповіді — Markdown.`;

    const userPrompt = `Створи детальне технічне завдання для написання контенту на тему: "${keyword}"

Параметри:
- Тип контенту: ${typeMap[contentType] || contentType}
- Регіон: ${regionMap[region] || region}

ТЗ повинно містити:
1. Рекомендовані параметри тексту (обсяг, кількість H2, H3, абзаців, зображень)
2. Детальну структуру заголовків з описом кожного розділу
3. SEO-вимоги (Title, Meta Description, щільність ключового слова, LSI-ключові слова — мінімум 15 штук)
4. Аналіз конкурентів ТОП-5 (вигадай реалістичні дані)
5. Вимоги до контенту (унікальність, читабельність, E-E-A-T)
6. Внутрішня перелінковка — рекомендації`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Перевищено ліміт запитів. Спробуйте пізніше." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Необхідно поповнити кредити AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Не вдалося згенерувати ТЗ.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
