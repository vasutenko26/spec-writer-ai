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

    const langMap: Record<string, string> = { uk: "українською мовою", ru: "на русском языке", en: "in English" };
    const typeMap: Record<string, string> = { article: "інформаційна стаття", landing: "лендінг/посадкова сторінка", product: "картка товару", category: "сторінка категорії" };
    const regionMap: Record<string, string> = { ua: "Україна", us: "USA", eu: "Europe" };

    const systemPrompt = `Ти — досвідчений SEO-стратег та контент-менеджер з 10+ років досвіду. Створюєш детальні технічні завдання (ТЗ) для копірайтерів, які виглядають як професійний документ.
Відповідай ${langMap[language] || "українською мовою"}.
Формат відповіді — Markdown з чіткою нумерацією розділів та підрозділів.
Використовуй ## для основних розділів (1, 2, 3...) та ### для підрозділів (3.1, 3.2...) та #### для під-підрозділів (3.1.1, 3.1.2...).`;

    const userPrompt = `Створи детальне професійне технічне завдання (ТЗ) для написання контенту на тему: "${keyword}"

Параметри:
- Тип контенту: ${typeMap[contentType] || contentType}
- Регіон: ${regionMap[region] || region}

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
Проаналізуй ТОП-10 видачі та створи таблицю:
| № | URL | Title | Кількість слів | H2 | H3 | Зображення |
Вигадай реалістичні дані для 10 конкурентів.

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
