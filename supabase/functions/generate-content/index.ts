import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, keywords, tone, wordCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneMap: Record<string, string> = {
      informational: "інформаційний, нейтральний, навчальний",
      commercial: "комерційний, переконливий, з закликами до дії",
      expert: "експертний, глибокий, з технічними деталями",
      casual: "розмовний, дружній, легкий для сприйняття",
    };

    const systemPrompt = `Ти — професійний SEO-копірайтер з 10+ років досвіду. Пишеш унікальний, корисний та SEO-оптимізований контент українською мовою.
Формат — Markdown з правильною ієрархією заголовків (H1, H2, H3).
Контент повинен бути структурований, з таблицями, списками, FAQ.`;

    const userPrompt = `Напиши SEO-оптимізовану статтю на тему: "${topic}"

Параметри:
- Обсяг: приблизно ${wordCount} слів
- Тон: ${toneMap[tone] || tone}
${keywords ? `- Ключові слова для інтеграції: ${keywords}` : ""}

Вимоги:
1. Привабливий вступ з хуком
2. Мінімум 5-7 розділів з H2 заголовками
3. Використовуй H3 для підрозділів
4. Додай списки, таблиці порівняння де доречно
5. Розділ FAQ з 4-5 питаннями
6. Сильний висновок з CTA
7. Природна інтеграція ключових слів (density 1.5-2.5%)
8. Контент має відповідати E-E-A-T принципам`;

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
    const content = data.choices?.[0]?.message?.content || "Не вдалося згенерувати контент.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
