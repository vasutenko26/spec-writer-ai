import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SE Ranking Data API engine IDs (Google) by region
const ENGINE_IDS: Record<string, number> = {
  ua: 1830, // Google Ukraine
  us: 1,    // Google USA
  eu: 17,   // Google UK (as proxy for EU)
};

async function fetchSerpFromSeRanking(keyword: string, region: string, apiKey: string): Promise<any[] | null> {
  const engineId = ENGINE_IDS[region] || ENGINE_IDS.ua;

  try {
    // 1. Create SERP task
    console.log(`Creating SERP task for "${keyword}" with engine_id ${engineId}`);
    const createRes = await fetch("https://api.seranking.com/v1/serp/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        engine_id: engineId,
        query: [keyword],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("SE Ranking create task error:", createRes.status, errText);
      return null;
    }

    const createData = await createRes.json();
    console.log("SERP task created:", JSON.stringify(createData));

    // Extract task_id from response
    const taskId = createData?.task_id || createData?.data?.task_id || createData?.id;
    if (!taskId) {
      console.error("No task_id in response:", JSON.stringify(createData));
      return null;
    }

    // 2. Poll for results (max 90 seconds, every 5 seconds)
    const maxAttempts = 18;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      console.log(`Polling SERP task ${taskId}, attempt ${i + 1}/${maxAttempts}`);
      const statusRes = await fetch(
        `https://api.seranking.com/v1/serp/tasks/status?task_id=${taskId}`,
        {
          headers: { "Authorization": `Token ${apiKey}` },
        }
      );

      if (!statusRes.ok) {
        const errText = await statusRes.text();
        console.error("SE Ranking status error:", statusRes.status, errText);
        continue;
      }

      const statusData = await statusRes.json();
      const status = statusData?.status || statusData?.data?.status;

      if (status === "done" || status === "completed") {
        // Extract results - top 10
        const results = statusData?.results || statusData?.data?.results || statusData?.data || [];
        const items = Array.isArray(results) ? results : (results?.items || results?.organic || []);
        console.log(`SERP results received: ${items.length} items`);
        return items.slice(0, 10);
      }

      if (status === "error" || status === "failed") {
        console.error("SERP task failed:", JSON.stringify(statusData));
        return null;
      }
    }

    console.warn("SERP task polling timeout");
    return null;
  } catch (e) {
    console.error("SE Ranking API error:", e);
    return null;
  }
}

function formatSerpTable(serpResults: any[]): string {
  if (!serpResults || serpResults.length === 0) return "";

  let table = "| № | URL | Title | Position |\n|---|-----|-------|----------|\n";
  serpResults.forEach((item, i) => {
    const url = item.url || item.link || "N/A";
    const title = (item.title || "N/A").replace(/\|/g, "\\|");
    const position = item.position || (i + 1);
    table += `| ${i + 1} | ${url} | ${title} | ${position} |\n`;
  });
  return table;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, language, region, contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SE_RANKING_API_KEY = Deno.env.get("SE_RANKING_API_KEY");

    const langMap: Record<string, string> = { uk: "українською мовою", ru: "на русском языке", en: "in English" };
    const typeMap: Record<string, string> = { article: "інформаційна стаття", landing: "лендінг/посадкова сторінка", product: "картка товару", category: "сторінка категорії" };
    const regionMap: Record<string, string> = { ua: "Україна", us: "USA", eu: "Europe" };

    // Fetch real SERP data if API key is available
    let serpData: any[] | null = null;
    let serpTable = "";
    if (SE_RANKING_API_KEY) {
      console.log("Fetching real SERP data from SE Ranking...");
      serpData = await fetchSerpFromSeRanking(keyword, region, SE_RANKING_API_KEY);
      if (serpData && serpData.length > 0) {
        serpTable = formatSerpTable(serpData);
        console.log("Real SERP data formatted successfully");
      } else {
        console.log("No SERP data received, AI will generate synthetic data");
      }
    }

    const serpSection = serpData && serpData.length > 0
      ? `\n\nРЕАЛЬНІ ДАНІ SERP (ТОП-10 Google) для "${keyword}":\n${serpTable}\nВикористай ці реальні дані конкурентів у розділі 3.2. Проаналізуй їх URL, заголовки та позиції. Доповни таблицю додатковими колонками (кількість слів, H2, H3, зображення) на основі своїх знань.`
      : `\nРеальних даних SERP немає. Вигадай реалістичні дані для 10 конкурентів у розділі 3.2.`;

    const systemPrompt = `Ти — досвідчений SEO-стратег та контент-менеджер з 10+ років досвіду. Створюєш детальні технічні завдання (ТЗ) для копірайтерів, які виглядають як професійний документ.
Відповідай ${langMap[language] || "українською мовою"}.
Формат відповіді — Markdown з чіткою нумерацією розділів та підрозділів.
Використовуй ## для основних розділів (1, 2, 3...) та ### для підрозділів (3.1, 3.2...) та #### для під-підрозділів (3.1.1, 3.1.2...).`;

    const userPrompt = `Створи детальне професійне технічне завдання (ТЗ) для написання контенту на тему: "${keyword}"

Параметри:
- Тип контенту: ${typeMap[contentType] || contentType}
- Регіон: ${regionMap[region] || region}
${serpSection}

ТЗ повинно мати таку ТОЧНУ структуру з нумерацією:

## 1) Мета та результат
Опиши мету створення контенту, що має бути на виході. Вкажи тип контенту та цільову аудиторію.

## 2) Основні ролі
- **Адмін**: що робить адмін
- **Користувач/Копірайтер**: що має зробити

## 3) Функціональні вимоги

### 3.1 Вхідні дані
Які дані потрібні для написання (ключове слово, регіон, мова, тип контенту тощо).

### 3.2 SERP-конкуренти (ТОП-10)
${serpData && serpData.length > 0 ? "Використай надані РЕАЛЬНІ дані SERP та доповни таблицю:" : "Проаналізуй ТОП-10 видачі та створи таблицю:"}
| № | URL | Title | Кількість слів | H2 | H3 | Зображення |

### 3.3 Рекомендовані параметри тексту
На основі аналізу конкурентів дай рекомендації у вигляді таблиці:
| Параметр | Мінімум | Рекомендовано | Максимум |
Включи: кількість слів, символів, H2, H3, абзаців, зображень, списків, таблиць.

### 3.4 Ключові слова конкурентів
Таблиця LSI/семантичних ключових слів (мінімум 20 штук):
| Ключове слово | Частотність | Рекомендована кількість вживань |

### 3.5 Структура заголовків (H1-H3)
Детальна рекомендована структура статті з усіма заголовками H1, H2, H3. Для кожного заголовка напиши короткий опис що має бути в розділі.

### 3.6 Посилання
Рекомендації щодо внутрішньої та зовнішньої перелінковки. Скільки посилань, якого типу, на які сторінки.

### 3.7 Питання (FAQ / People Also Ask)
Список із 5-8 питань які часто задають користувачі по цій темі. Ці питання мають бути інтегровані в контент або в блок FAQ.

### 3.8 Мета-теги та slug
Рекомендації для:
- **Title** (до 60 символів) — 2-3 варіанти
- **Meta Description** (до 160 символів) — 2-3 варіанти
- **URL slug** — рекомендований

### 3.9 Вимоги до контенту
- Унікальність: мінімум X%
- Читабельність: рівень за шкалою Flesch
- Тон тексту
- E-E-A-T вимоги
- Щільність ключового слова: X-X%

### 3.10 Експорт / формат здачі
В якому форматі має бути здано (Google Docs, HTML, Markdown тощо).

ВАЖЛИВО: Дотримуйся нумерації розділів. Кожен розділ має бути інформативним та конкретним. Таблиці використовуй де зазначено.`;

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

    return new Response(JSON.stringify({ 
      content,
      serpDataUsed: serpData !== null && serpData.length > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
