import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENGINE_IDS: Record<string, number> = {
  ua: 1830,
  us: 1,
  eu: 17,
};

interface ScrapedPage {
  url: string;
  title: string;
  position: number;
  wordCount: number;
  imageCount: number;
  h1: string[];
  h2: string[];
  h3: string[];
}

async function scrapePage(url: string): Promise<Omit<ScrapedPage, 'url' | 'title' | 'position'> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "uk,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    // Remove script/style/nav/footer to get cleaner text
    for (const tag of ["script", "style", "nav", "footer", "header", "aside"]) {
      doc.querySelectorAll(tag).forEach((el: any) => el.remove());
    }

    const bodyText = (doc.querySelector("body")?.textContent || "").replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    const imageCount = doc.querySelectorAll("img").length;

    const extractHeadings = (tag: string): string[] => {
      const headings: string[] = [];
      doc.querySelectorAll(tag).forEach((el: any) => {
        const text = (el.textContent || "").trim();
        if (text && text.length < 200) headings.push(text);
      });
      return headings;
    };

    return {
      wordCount,
      imageCount,
      h1: extractHeadings("h1"),
      h2: extractHeadings("h2"),
      h3: extractHeadings("h3"),
    };
  } catch (e) {
    console.warn(`Failed to scrape ${url}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function scrapeCompetitors(serpResults: any[]): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];

  // Scrape up to 10 pages in parallel
  const urls = serpResults.slice(0, 10).map((item, i) => ({
    url: item.url || item.link || "",
    title: item.title || "N/A",
    position: item.position || (i + 1),
  }));

  const scrapePromises = urls.map(async ({ url, title, position }) => {
    if (!url || url === "N/A") return null;
    const scraped = await scrapePage(url);
    if (!scraped) return { url, title, position, wordCount: 0, imageCount: 0, h1: [], h2: [], h3: [] };
    return { url, title, position, ...scraped };
  });

  const results = await Promise.all(scrapePromises);
  for (const r of results) {
    if (r) pages.push(r);
  }

  return pages;
}

function formatScrapedTable(pages: ScrapedPage[]): string {
  if (!pages.length) return "";

  let table = "| № | URL | Title | Слів | H1 | H2 | H3 | Зображень |\n|---|-----|-------|------|----|----|----|-----------|\n";
  pages.forEach((p, i) => {
    const shortUrl = p.url.length > 50 ? p.url.substring(0, 47) + "..." : p.url;
    const title = (p.title || "N/A").replace(/\|/g, "\\|").substring(0, 60);
    table += `| ${i + 1} | ${shortUrl} | ${title} | ${p.wordCount} | ${p.h1.length} | ${p.h2.length} | ${p.h3.length} | ${p.imageCount} |\n`;
  });
  return table;
}

function formatHeadingsDetail(pages: ScrapedPage[]): string {
  let detail = "";
  pages.forEach((p, i) => {
    if (p.h1.length === 0 && p.h2.length === 0 && p.h3.length === 0) return;
    detail += `\n**Конкурент ${i + 1}** (${p.url}):\n`;
    if (p.h1.length) detail += `- H1: ${p.h1.map(h => `"${h}"`).join(", ")}\n`;
    if (p.h2.length) detail += `- H2 (${p.h2.length}): ${p.h2.slice(0, 15).map(h => `"${h}"`).join(", ")}${p.h2.length > 15 ? "..." : ""}\n`;
    if (p.h3.length) detail += `- H3 (${p.h3.length}): ${p.h3.slice(0, 10).map(h => `"${h}"`).join(", ")}${p.h3.length > 10 ? "..." : ""}\n`;
  });
  return detail;
}

async function fetchSerpFromSeRanking(keyword: string, region: string, apiKey: string): Promise<any[] | null> {
  const engineId = ENGINE_IDS[region] || ENGINE_IDS.ua;

  try {
    console.log(`Creating SERP task for "${keyword}" with engine_id ${engineId}`);
    const createRes = await fetch("https://api.seranking.com/v1/serp/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ engine_id: engineId, query: [keyword] }),
    });

    if (!createRes.ok) {
      console.error("SE Ranking create task error:", createRes.status, await createRes.text());
      return null;
    }

    const createData = await createRes.json();
    // Response can be an array like [{query, task_id}] or an object
    const firstItem = Array.isArray(createData) ? createData[0] : createData;
    const taskId = firstItem?.task_id || firstItem?.data?.task_id || firstItem?.id;
    if (!taskId) {
      console.error("No task_id in response:", JSON.stringify(createData));
      return null;
    }

    const maxAttempts = 18;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`Polling SERP task ${taskId}, attempt ${i + 1}/${maxAttempts}`);

      const statusRes = await fetch(`https://api.seranking.com/v1/serp/tasks/status?task_id=${taskId}`, {
        headers: { "Authorization": `Token ${apiKey}` },
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData?.status || statusData?.data?.status;

      if (status === "done" || status === "completed") {
        const results = statusData?.results || statusData?.data?.results || statusData?.data || [];
        const items = Array.isArray(results) ? results : (results?.items || results?.organic || []);
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

    // 1. Fetch SERP data
    let serpResults: any[] | null = null;
    if (SE_RANKING_API_KEY) {
      console.log("Fetching SERP data from SE Ranking...");
      serpResults = await fetchSerpFromSeRanking(keyword, region, SE_RANKING_API_KEY);
    }

    // 2. Scrape competitor pages for real structure data
    let scrapedPages: ScrapedPage[] = [];
    let scrapedTable = "";
    let headingsDetail = "";

    if (serpResults && serpResults.length > 0) {
      console.log(`Scraping ${serpResults.length} competitor pages...`);
      scrapedPages = await scrapeCompetitors(serpResults);
      scrapedTable = formatScrapedTable(scrapedPages);
      headingsDetail = formatHeadingsDetail(scrapedPages);
      console.log(`Successfully scraped ${scrapedPages.filter(p => p.wordCount > 0).length}/${scrapedPages.length} pages`);
    }

    // 3. Build SERP section for prompt
    const serpSection = scrapedPages.length > 0
      ? `\n\nРЕАЛЬНІ ДАНІ КОНКУРЕНТІВ (ТОП-10 Google) для "${keyword}":\n\nТаблиця конкурентів:\n${scrapedTable}\n\nДетальна структура заголовків конкурентів:\n${headingsDetail}\n\nВикористай ці РЕАЛЬНІ дані у розділах 3.2, 3.3, 3.5. Аналізуй реальну кількість слів, заголовків та зображень для рекомендацій.`
      : serpResults && serpResults.length > 0
        ? `\n\nДані SERP (URL та Title) для "${keyword}" отримано, але скрапінг сторінок не вдався. Доповни таблицю на основі своїх знань.`
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
${scrapedPages.length > 0 ? "Використай надані РЕАЛЬНІ дані скрапінгу конкурентів:" : serpResults && serpResults.length > 0 ? "Використай надані дані SERP та доповни:" : "Проаналізуй ТОП-10 видачі та створи таблицю:"}
| № | URL | Title | Кількість слів | H2 | H3 | Зображення |

### 3.3 Рекомендовані параметри тексту
На основі аналізу конкурентів дай рекомендації у вигляді таблиці:
| Параметр | Мінімум | Рекомендовано | Максимум |
Включи: кількість слів, символів, H2, H3, абзаців, зображень, списків, таблиць.

### 3.4 Ключові слова конкурентів
Таблиця LSI/семантичних ключових слів (мінімум 20 штук):
| Ключове слово | Частотність | Рекомендована кількість вживань |

### 3.5 Структура заголовків (H1-H3)
${scrapedPages.length > 0 ? "На основі РЕАЛЬНИХ заголовків конкурентів створи оптимальну структуру:" : "Детальна рекомендована структура статті з усіма заголовками H1, H2, H3."}
Для кожного заголовка напиши короткий опис що має бути в розділі.

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
      serpDataUsed: serpResults !== null && serpResults.length > 0,
      pagesScraped: scrapedPages.filter(p => p.wordCount > 0).length,
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
