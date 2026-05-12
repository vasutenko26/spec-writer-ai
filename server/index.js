import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { parse } from 'node-html-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { marked } from 'marked';
import rateLimit from 'express-rate-limit';
import { spawn } from 'child_process';
import ExcelJS from 'exceljs';

// ── Auth ──────────────────────────────────────────────────────────────────────
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

// ── Projects module routes ────────────────────────────────────────────────────
import projectsRouter from './routes/projects.js';
import knowledgeBaseRouter from './routes/knowledgeBase.js';
import hypothesesRouter from './routes/hypotheses.js';
import anomaliesRouter from './routes/anomalies.js';
import contentPlanRouter from './routes/contentPlan.js';
import competitorsRouter from './routes/competitors.js';

// ── Content management routes ─────────────────────────────────────────────────
import foldersRouter from './routes/folders.js';
import briefsRouter from './routes/briefs.js';
import publicationsRouter from './routes/publications.js';
import sharesRouter from './routes/shares.js';
import gscRouter, { gscCallbackHandler } from './routes/gsc.js';

// ── Services ──────────────────────────────────────────────────────────────────
import claudeCLI from './services/ClaudeCLIWrapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const app = express();

// ── CORS — allow only own domain ──────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://aiagentlab.fun', 'https://www.aiagentlab.fun', 'http://localhost:5173', 'http://localhost:4173'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    const err = new Error('Not allowed by CORS');
    err.status = 403;
    cb(err);
  },
  credentials: true,
}));

// CORS error handler
app.use((err, _req, res, next) => {
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Forbidden' });
  next(err);
});

app.use(express.json({ limit: '50mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const heavyLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://127.0.0.1:8888';
const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const DATAFORSEO_BASE64 = process.env.DATAFORSEO_BASE64;
const SERANKING_API_KEY = process.env.SERANKING_API_KEY;
const PORT = Number(process.env.PORT) || 3001;

// ── Claude Code CLI helper ────────────────────────────────────────────────────

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', prompt, '--output-format', 'text'], {
      env: { ...process.env, HOME: process.env.HOME || '/root' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI timeout (120s)'));
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude CLI exited ${code}: ${stderr.slice(0, 300) || 'empty output'}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in server/.env');
  process.exit(1);
}

// ── Gemini API ────────────────────────────────────────────────────────────────

const OVERLOAD_ERROR = 'GEMINI_OVERLOADED';

async function callGemini(systemPrompt, userPrompt, model = GEMINI_MODEL, retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192, topP: 0.95 },
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (res.status === 503 && attempt < retries) {
      console.warn(`[gemini] 503 overloaded on ${model}, retry ${attempt}/${retries}...`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        const err = new Error('Перевищено ліміт запитів Gemini. Спробуйте пізніше.');
        err.code = OVERLOAD_ERROR;
        throw err;
      }
      if (res.status === 503) {
        const err = new Error(`Gemini ${model} тимчасово перевантажений.`);
        err.code = OVERLOAD_ERROR;
        throw err;
      }
      throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini повернув порожню відповідь');
    return text;
  }
}

// ── SearXNG SERP ──────────────────────────────────────────────────────────────

async function fetchSerpFromSearXNG(keyword, region) {
  const langMap = { ua: 'uk-UA', us: 'en-US', eu: 'en-GB' };
  const params = new URLSearchParams({
    q: keyword,
    format: 'json',
    engines: 'google,bing',
    language: langMap[region] || 'uk-UA',
    categories: 'general',
  });

  const res = await fetch(`${SEARXNG_URL}/search?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.slice(0, 10) || null;
}

// ── Page scraper ──────────────────────────────────────────────────────────────

const PRIVATE_IP_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1)/;

function isSafeUrl(rawUrl) {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    if (!['http:', 'https:'].includes(protocol)) return false;
    if (PRIVATE_IP_RE.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function scrapePage(url) {
  if (!isSafeUrl(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'uk,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return null;

    const html = await res.text();
    const root = parse(html);
    for (const tag of ['script', 'style', 'nav', 'footer', 'header', 'aside']) {
      root.querySelectorAll(tag).forEach((el) => el.remove());
    }

    const bodyText = (root.querySelector('body')?.text || '').replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const imageCount = root.querySelectorAll('img').length;

    const extractHeadings = (tag) =>
      root.querySelectorAll(tag)
        .map((el) => el.text.replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 200)
        .slice(0, 20);

    // Extract all headings in document order (h1–h6) for OutlineBuilder
    const headings = [];
    root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => {
      const text = el.text.replace(/\s+/g, ' ').trim();
      if (text && text.length < 200) {
        headings.push({ tag: el.tagName.toUpperCase(), text });
      }
    });

    return { wordCount, imageCount, h1: extractHeadings('h1'), h2: extractHeadings('h2'), h3: extractHeadings('h3'), headings };
  } catch (e) {
    console.warn(`  scrape failed: ${url} — ${e.message}`);
    return null;
  }
}

async function scrapeCompetitors(serpResults) {
  const urls = serpResults.slice(0, 10).map((item, i) => ({
    url: item.url || item.link || '',
    title: item.title || 'N/A',
    position: i + 1,
  }));

  const results = await Promise.all(
    urls.map(async ({ url, title, position }) => {
      if (!url) return null;
      const scraped = await scrapePage(url);
      return scraped
        ? { url, title, position, ...scraped }
        : { url, title, position, wordCount: 0, imageCount: 0, h1: [], h2: [], h3: [], headings: [] };
    })
  );
  return results.filter(Boolean);
}

function formatScrapedTable(pages) {
  if (!pages.length) return '';
  let t = '| № | URL | Title | Слів | H1 | H2 | H3 | Зображень |\n|---|-----|-------|------|----|----|----|-----------|\n';
  pages.forEach((p, i) => {
    const url = p.url.length > 50 ? p.url.slice(0, 47) + '...' : p.url;
    const title = (p.title || 'N/A').replace(/\|/g, '\\|').slice(0, 60);
    t += `| ${i + 1} | ${url} | ${title} | ${p.wordCount} | ${p.h1.length} | ${p.h2.length} | ${p.h3.length} | ${p.imageCount} |\n`;
  });
  return t;
}

function formatHeadingsDetail(pages) {
  return pages
    .map((p, i) => {
      if (!p.h1.length && !p.h2.length && !p.h3.length) return '';
      let s = `\n**Конкурент ${i + 1}** (${p.url}):\n`;
      if (p.h1.length) s += `- H1: ${p.h1.map((h) => `"${h}"`).join(', ')}\n`;
      if (p.h2.length) s += `- H2 (${p.h2.length}): ${p.h2.slice(0, 12).map((h) => `"${h}"`).join(', ')}${p.h2.length > 12 ? '...' : ''}\n`;
      if (p.h3.length) s += `- H3 (${p.h3.length}): ${p.h3.slice(0, 8).map((h) => `"${h}"`).join(', ')}${p.h3.length > 8 ? '...' : ''}\n`;
      return s;
    })
    .join('');
}

function calcStats(pages) {
  const valid = pages.filter((p) => p.wordCount > 0);
  if (!valid.length) return null;
  return {
    avgWords: Math.round(valid.reduce((s, p) => s + p.wordCount, 0) / valid.length),
    avgH2: Math.round(valid.reduce((s, p) => s + p.h2.length, 0) / valid.length),
    avgH3: Math.round(valid.reduce((s, p) => s + p.h3.length, 0) / valid.length),
    avgImages: Math.round(valid.reduce((s, p) => s + p.imageCount, 0) / valid.length),
    successfulScrapes: valid.length,
    totalResults: pages.length,
  };
}

// ── Priority Task Queue (max 2 concurrent heavy ops) ─────────────────────────

const MAX_CONCURRENT = 2;
let activeSlots = 0;
const pendingQueue = []; // { priority: number, run: () => Promise }

async function runWithPriority(priority = 5, fn) {
  return new Promise((resolve, reject) => {
    const slot = async () => {
      activeSlots++;
      try { resolve(await fn()); }
      catch (e) { reject(e); }
      finally { activeSlots--; pumpQueue(); }
    };
    if (activeSlots < MAX_CONCURRENT) {
      slot();
    } else {
      pendingQueue.push({ priority: Number(priority) || 5, run: slot });
      pendingQueue.sort((a, b) => a.priority - b.priority); // 1 = highest
    }
  });
}

function pumpQueue() {
  if (pendingQueue.length > 0 && activeSlots < MAX_CONCURRENT) {
    const { run } = pendingQueue.shift();
    run();
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Auth (public — must be before requireAuth) ────────────────────────────────
app.use('/api/auth', authRouter);

// ── GSC OAuth callback (no JWT — redirect from Google) ───────────────────────
app.get('/api/gsc/callback', gscCallbackHandler);

// ── All /api/* routes below require valid JWT ─────────────────────────────────
app.use('/api', requireAuth);

// ── Heavy AI endpoints rate limit ─────────────────────────────────────────────
app.use(['/api/serp-analyze', '/api/generate-brief', '/api/generate-content', '/api/lsi-analyze',
  '/api/semantic-cluster', '/api/smart-linking', '/api/semantic-cluster-stream',
  '/api/ai-detect', '/api/rewrite-fragment', '/api/generate-meta', '/api/generate-headings', '/api/generate-questions',
  '/api/generate-images', '/api/plan-images', '/api/keywords-research'], heavyLimiter);

// ── SERP Analysis (standalone tool) ──────────────────────────────────────────

app.post('/api/serp-analyze', async (req, res) => {
  const { keyword, region, language, priority = 5 } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  const langMap = { uk: 'українською', en: 'in English' };
  console.log(`[serp-analyze] "${keyword}" region=${region}`);

  // 1. Fetch SERP
  let serpResults = null;
  try {
    serpResults = await fetchSerpFromSearXNG(keyword, region || 'ua');
  } catch (e) {
    console.warn('[serp-analyze] SearXNG error:', e.message);
    return res.status(503).json({ error: 'SearXNG недоступний. Перевірте що контейнер запущено.' });
  }

  if (!serpResults || serpResults.length === 0) {
    return res.status(404).json({ error: 'Немає результатів пошуку. Перевірте запит або запустіть SearXNG.' });
  }

  // 2. Scrape competitor pages
  const pages = await scrapeCompetitors(serpResults);
  const scrapedTable = formatScrapedTable(pages);
  const headingsDetail = formatHeadingsDetail(pages);
  const stats = calcStats(pages);

  console.log(`[serp-analyze] Scraped ${stats?.successfulScrapes || 0}/${pages.length} pages`);

  // 3. Gemini landscape analysis
  const systemPrompt = `Ти — SEO-аналітик. Аналізуєш пошукову видачу та надаєш стислі висновки.
Відповідай ${langMap[language] || 'українською'}. Формат — Markdown.`;

  const userPrompt = `Проаналізуй пошукову видачу для запиту: "${keyword}"

Дані конкурентів ТОП-10:
${scrapedTable}

Заголовки конкурентів:
${headingsDetail.slice(0, 3000)}

Надай стислий аналіз за структурою:

## Пошуковий намір (Search Intent)
## Типи контенту в ТОП-10
## Середні параметри
Обсяг, кількість H2/H3, зображень
## Ключові теми та підтеми
## Рекомендації для нового контенту`;

  let aiAnalysis = '';
  try {
    aiAnalysis = await runWithPriority(Number(priority) || 5, () => callGemini(systemPrompt, userPrompt));
  } catch (e) {
    console.warn('[serp-analyze] Gemini error:', e.message);
    aiAnalysis = `> Gemini аналіз недоступний: ${e.message}`;
  }

  res.json({ keyword, region, pages, scrapedTable, headingsDetail, aiAnalysis, stats });
});

// ── SEO Checker ───────────────────────────────────────────────────────────────

app.post('/api/seo-check', async (req, res) => {
  const { content, keywords, stats } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  console.log(`[seo-check] words=${stats?.wordCount} keywords=${keywords?.length || 0}`);

  const kwStats = stats?.keywordStats?.length
    ? stats.keywordStats.map((k) => `  • "${k.keyword}": ${k.count} разів (${k.density}%)`).join('\n')
    : '—';

  const systemPrompt = `Ти — досвідчений SEO-аналітик і редактор. Аналізуєш тексти та даєш конкретні рекомендації.
Відповідай українською. Формат — Markdown з розділами ## і конкретними прикладами.`;

  const userPrompt = `Проаналізуй SEO-текст:

**Статистика:**
- Слів: ${stats?.wordCount || '?'}
- Символів: ${stats?.charCount || '?'}
- H1: ${stats?.h1 || 0}, H2: ${stats?.h2 || 0}, H3: ${stats?.h3 || 0}
- Абзаців: ${stats?.paragraphs || 0}, Списків: ${stats?.lists || 0}
- Середня довжина речення: ${stats?.avgSentenceLength || '?'} слів
${keywords?.length ? `- Ключові слова: ${keywords.join(', ')}\n- Щільність КС:\n${kwStats}` : ''}

**Початок тексту (перші 2500 символів):**
\`\`\`
${content.slice(0, 2500)}
\`\`\`

Надай аналіз за структурою:

## 📖 Читабельність
Оціни складність тексту (рівень аудиторії), довжину речень, абзаців.

## 🏗 Структура
Оціни логіку заголовків, розбивку на розділи, наявність списків/таблиць.

## 🔍 SEO-оптимізація
Оціни щільність ключових слів, природність інтеграції, покриття теми.

## ✅ Рекомендації
Дай 4-6 конкретних покращень з прикладами. Формат: **Проблема** → Рішення.`;

  try {
    const analysis = await callGemini(systemPrompt, userPrompt);
    res.json({ analysis });
  } catch (e) {
    console.error('[seo-check] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Brief (accepts pre-fetched serpData) ─────────────────────────────

app.post('/api/generate-brief', async (req, res) => {
  const { keyword, language, region, contentType, serpData, customStructure, selectedUrls, metaTitle, metaDescription, slug, questions, priority = 5, model } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  const langMap = { uk: 'українською', en: 'англійською', ru: 'російською', pl: 'польською', de: 'німецькою', fr: 'французькою', es: 'іспанською', it: 'італійською', cs: 'чеською', ro: 'румунською' };
  const typeMap = { article: 'інформаційна стаття', landing: 'лендінг/посадкова сторінка', product: 'картка товару', category: 'сторінка категорії' };
  const regionMap = { ua: 'Україна', us: 'США', gb: 'Велика Британія', eu: 'Європа', pl: 'Польща', de: 'Німеччина', fr: 'Франція', es: 'Іспанія', it: 'Італія', cz: 'Чехія', ro: 'Румунія', ca: 'Канада', au: 'Австралія' };

  console.log(`[brief] "${keyword}" serpData=${serpData ? `${serpData.length} pages (pre-fetched)` : 'none'}`);

  let scrapedPages = [];
  let serpResultsForLog = null;

  if (serpData && Array.isArray(serpData) && serpData.length > 0) {
    // ✓ Re-use data from SERP Analysis tool — skip SearXNG + scraping
    scrapedPages = serpData;
    serpResultsForLog = serpData;
    console.log(`[brief] Using ${serpData.length} pre-fetched pages`);
  } else {
    // Fresh SERP fetch
    try {
      serpResultsForLog = await fetchSerpFromSearXNG(keyword, region);
      console.log(`[brief] SERP: ${serpResultsForLog?.length ?? 0} results`);
    } catch (e) {
      console.warn('[brief] SearXNG unavailable:', e.message);
    }
    if (serpResultsForLog?.length) {
      scrapedPages = await scrapeCompetitors(serpResultsForLog);
      console.log(`[brief] Scraped ${scrapedPages.filter((p) => p.wordCount > 0).length}/${scrapedPages.length} pages`);
    }
  }

  const scrapedTable = formatScrapedTable(scrapedPages);
  const headingsDetail = formatHeadingsDetail(scrapedPages);

  const serpSection =
    scrapedPages.length > 0
      ? `\n\nРЕАЛЬНІ ДАНІ КОНКУРЕНТІВ (ТОП-10) для "${keyword}":\n\nТаблиця:\n${scrapedTable}\n\nЗаголовки:\n${headingsDetail.slice(0, 4000)}`
      : serpResultsForLog?.length
        ? `\n\nURL та Title конкурентів отримано, але скрапінг не вдався.`
        : `\nРеальних SERP-даних немає. Використай свої знання для заповнення таблиці.`;

  const hasCustomStructure = Array.isArray(customStructure) && customStructure.length > 0;
  const customStructureBlock = hasCustomStructure
    ? `\n\nОБОВ'ЯЗКОВА СТРУКТУРА ЗАГОЛОВКІВ (задана користувачем — використай її ТОЧНО у розділі 3.5, не додавай і не прибирай заголовки):\n${customStructure.map((h) => `${h.tag}: ${h.text}`).join('\n')}`
    : '';

  const systemPrompt = `Ти — досвідчений SEO-стратег та контент-менеджер. Створюєш детальні ТЗ для копірайтерів.
Відповідай ${langMap[language] || 'українською мовою'}. Формат — Markdown: ## для розділів, ### для підрозділів.${hasCustomStructure ? '\nВАЖЛИВО: Структуру заголовків у розділі 3.5 взяти ВИКЛЮЧНО з переданого масиву customStructure. Не вигадуй власних заголовків.' : ''}`;

  const selectedUrlsBlock = Array.isArray(selectedUrls) && selectedUrls.length > 0
    ? `\nВибрані URL конкурентів для аналізу (пріоритет): ${selectedUrls.join(', ')}`
    : '';

  const metaBlock = (metaTitle || metaDescription || slug)
    ? `\n\nМЕТА-ТЕГИ (задані користувачем — використай ТОЧНО в розділі 3.8):\n${metaTitle ? `Title: ${metaTitle}` : ''}${metaDescription ? `\nDescription: ${metaDescription}` : ''}${slug ? `\nSlug: ${slug}` : ''}`
    : '';

  const linksBlock = (() => {
    const int = (req.body.internalLinks || []).filter(Boolean);
    const ext = (req.body.externalLinks || []).filter(Boolean);
    if (!int.length && !ext.length) return '';
    return `\n\nПОСИЛАННЯ (використай ТОЧНО в розділі 3.6 Перелінковка):`
      + (int.length ? `\nВнутрішні:\n${int.map((u) => `- ${u}`).join('\n')}` : '')
      + (ext.length ? `\nЗовнішні авторитетні джерела:\n${ext.map((u) => `- ${u}`).join('\n')}` : '');
  })();

  const notesBlock = req.body.notes?.trim()
    ? `\n\nДОДАТКОВІ ВИМОГИ ВІД ЗАМОВНИКА (обов'язково врахувати):\n${req.body.notes}`
    : '';

  const userPrompt = `Створи детальне ТЗ для написання контенту на тему: "${keyword}"

Параметри: тип — ${typeMap[contentType] || contentType}, регіон — ${regionMap[region] || region}${selectedUrlsBlock}
${serpSection}${customStructureBlock}${metaBlock}${linksBlock}${notesBlock}

СТРУКТУРА (дотримуйся нумерації):
## 1) Мета та результат
## 2) Основні ролі
## 3) Функціональні вимоги
### 3.1 Вхідні дані
### 3.2 SERP-конкуренти (ТОП-10)
| № | URL | Title | Кількість слів | H2 | H3 | Зображення |
### 3.3 Рекомендовані параметри
| Параметр | Мінімум | Рекомендовано | Максимум |
### 3.4 Ключові слова (мін. 20 LSI)
| Ключове слово | Частотність | Рекомендована к-сть вживань |
### 3.5 Структура заголовків H1–H3${hasCustomStructure ? ' (ОБОВ\'ЯЗКОВО: використай точно ту структуру, що в customStructure вище)' : ''}
### 3.6 Посилання
${Array.isArray(questions) && questions.length > 0
  ? `### 3.7 FAQ\nВикористай САМЕ ЦІ питання від користувача (не вигадуй нові):\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  : `### 3.7 FAQ (5-8 питань що реально шукають у Google по темі)`}
### 3.8 Мета-теги та slug (2-3 варіанти)
### 3.9 Вимоги до контенту
### 3.10 Формат здачі`;

  const chosenModel = model || GEMINI_MODEL;
  try {
    const content = await runWithPriority(Number(priority) || 5, () => callGemini(systemPrompt, userPrompt, chosenModel));
    res.json({
      content,
      modelUsed: chosenModel,
      serpDataUsed: scrapedPages.length > 0,
      pagesScraped: scrapedPages.filter((p) => p.wordCount > 0).length,
      usedPreFetched: !!(serpData && serpData.length > 0),
    });
  } catch (e) {
    console.error('[brief] error:', e.message);
    const isOverload = e.code === OVERLOAD_ERROR;
    res.status(isOverload ? 503 : 500).json({ error: e.message, overloaded: isOverload });
  }
});

// ── Generate Meta Tags ────────────────────────────────────────────────────────

app.post('/api/generate-meta', async (req, res) => {
  const { keyword, language, contentType } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  const langMap = { uk: 'українською', en: 'англійською', ru: 'російською', pl: 'польською', de: 'німецькою', fr: 'французькою', es: 'іспанською', it: 'італійською', cs: 'чеською', ro: 'румунською' };
  const typeMap = { article: 'інформаційна стаття', landing: 'лендінг', product: 'картка товару', category: 'сторінка категорії' };

  const systemPrompt = `Ти — SEO-спеціаліст. Генеруєш мета-теги для сторінок. Відповідай ${langMap[language] || 'українською мовою'}. Відповідай ЛИШЕ валідним JSON без markdown-блоків.`;
  const userPrompt = `Згенеруй оптимальні SEO мета-теги для сторінки типу "${typeMap[contentType] || contentType}" на тему: "${keyword}".

Вимоги:
- title: рівно 50-70 символів, включає ключове слово, привабливий для кліку
- description: рівно 140-160 символів, включає ключове слово + CTA
- slug: URL-friendly slug латиницею (тільки a-z, 0-9, дефіси), 3-6 слів

Відповідь ТІЛЬКИ у форматі JSON:
{"title":"...","description":"...","slug":"..."}`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ title: parsed.title || '', description: parsed.description || '', slug: parsed.slug || '' });
  } catch (e) {
    console.error('[generate-meta] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Images via Imagen 4 with Gemini fallback ────────────────────────
app.post('/api/generate-images', async (req, res) => {
  const { prompts, aspectRatio = '16:9' } = req.body;
  if (!Array.isArray(prompts) || prompts.length === 0)
    return res.status(400).json({ error: 'prompts array required' });
  if (prompts.length > 5)
    return res.status(400).json({ error: 'max 5 images per request' });

  const apiKey = GEMINI_API_KEY;

  async function generateOneImage(prompt) {
    // Try Imagen 4 models first (fast → standard)
    const imagenModels = ['imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];
    for (const model of imagenModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio, safetyFilterLevel: 'BLOCK_SOME', personGeneration: 'ALLOW_ADULT' },
          }),
          signal: AbortSignal.timeout(60000),
        });
        const d = await r.json();
        if (r.ok && d.predictions?.[0]?.bytesBase64Encoded) {
          return { b64: d.predictions[0].bytesBase64Encoded, mimeType: d.predictions[0].mimeType || 'image/png', modelUsed: model };
        }
        console.log(`[images] ${model} failed:`, d.error?.message || 'no prediction');
      } catch (e) {
        console.log(`[images] ${model} error:`, e.message);
      }
    }
    // Fallback: Gemini image generation models
    const geminiImageModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];
    for (const model of geminiImageModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate a photorealistic image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
          signal: AbortSignal.timeout(60000),
        });
        const d = await r.json();
        const parts = d.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
        if (imgPart) {
          return { b64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType, modelUsed: model };
        }
        console.log(`[images] ${model} failed:`, d.error?.message || 'no image part');
      } catch (e) {
        console.log(`[images] ${model} error:`, e.message);
      }
    }
    throw new Error('Всі моделі генерації зображень недоступні');
  }

  try {
    const results = await Promise.all(prompts.map(async ({ prompt, position }) => {
      const img = await generateOneImage(prompt);
      return { position, prompt, ...img };
    }));
    res.json({ images: results });
  } catch (e) {
    console.error('[generate-images]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Auto-plan image placements from article content ───────────────────────────
app.post('/api/plan-images', async (req, res) => {
  const { content, keyword, count = 3 } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  const systemPrompt = `Ти — SEO-спеціаліст і контент-редактор. Відповідай ЛИШЕ валідним JSON без markdown.`;
  const userPrompt = `Проаналізуй цю статтю і запропонуй ${count} місця для зображень.

Стаття (перші 3000 символів):
${content.slice(0, 3000)}

Ключове слово: ${keyword || 'не вказано'}

Для кожного зображення вкажи:
- afterHeading: точний текст заголовка H2/H3 після якого вставити зображення (або "intro" для вступу)
- prompt: детальний англійський промпт для Imagen 3 (фотореалістично, без людей якщо не потрібно, з описом стилю)
- altText: alt текст українською для SEO
- caption: підпис до зображення українською (опціонально)

Відповідь ТІЛЬКИ JSON:
{"placements":[{"afterHeading":"...","prompt":"...","altText":"...","caption":"..."}]}`;

  try {
    const modelOrder = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    let raw = null;
    for (const model of modelOrder) {
      try {
        raw = await callGemini(systemPrompt, userPrompt, model);
        break;
      } catch (e) {
        console.log(`[plan-images] ${model} failed:`, e.message);
      }
    }
    if (!raw) throw new Error('Всі моделі недоступні');
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (e) {
    console.error('[plan-images]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Headings Structure ───────────────────────────────────────────────

app.post('/api/generate-headings', async (req, res) => {
  const { keyword, language, contentType } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  const langMap = { uk: 'українською', en: 'англійською', ru: 'російською', pl: 'польською', de: 'німецькою', fr: 'французькою', es: 'іспанською', it: 'італійською', cs: 'чеською', ro: 'румунською' };
  const typeMap = { article: 'інформаційна стаття', landing: 'лендінг', product: 'картка товару', category: 'сторінка категорії' };

  const systemPrompt = `Ти — досвідчений SEO-стратег. Генеруєш структуру заголовків для контенту. Відповідай ${langMap[language] || 'українською мовою'}. Відповідай ЛИШЕ валідним JSON без markdown-блоків.`;
  const userPrompt = `Створи оптимальну SEO-структуру заголовків для сторінки типу "${typeMap[contentType] || contentType}" на тему: "${keyword}".

Вимоги:
- Один H1 (точно відповідає темі, включає ключове слово)
- 5-8 H2 (основні розділи)
- 2-3 H3 під кожним H2 де доречно
- Заголовки унікальні, інформативні, SEO-оптимізовані

Відповідь ТІЛЬКИ у форматі JSON:
{"headings":[{"tag":"H1","text":"..."},{"tag":"H2","text":"..."},{"tag":"H3","text":"..."}]}`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const headings = Array.isArray(parsed.headings) ? parsed.headings : [];
    res.json({ headings });
  } catch (e) {
    console.error('[generate-headings] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Questions (PAA-style) ────────────────────────────────────────────

app.post('/api/generate-questions', async (req, res) => {
  const { keyword, language, contentType, competitorHeadings = [] } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  const langMap = { uk: 'українською', en: 'англійською', ru: 'російською', pl: 'польською', de: 'німецькою', fr: 'французькою', es: 'іспанською', it: 'італійською', cs: 'чеською', ro: 'румунською' };
  const typeMap = { article: 'статті', landing: 'лендінгу', product: 'товару', category: 'категорії' };

  const headingsContext = competitorHeadings.length > 0
    ? `\nЗаголовки конкурентів для контексту:\n${competitorHeadings.slice(0, 30).join('\n')}`
    : '';

  const systemPrompt = `Ти — SEO-аналітик. Генеруєш питання які реально шукають користувачі. Відповідай ЛИШЕ валідним JSON без markdown.`;
  const userPrompt = `Згенеруй 10 питань які люди реально шукають у Google по темі: "${keyword}" (тип сторінки: ${typeMap[contentType] || 'статті'}).${headingsContext}
Вимоги:
- Питання мають бути різних типів: що/як/чому/де/коли/скільки/чи варто
- Реальні питання які вводять у пошуку, не академічні
- Мовою: ${langMap[language] || 'українською'}
- Від простих до складних
Відповідь ТІЛЬКИ у форматі JSON:
{"questions":[{"text":"...","type":"what|how|why|where|when|price|compare"}]}`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    res.json({ questions });
  } catch (e) {
    console.error('[generate-questions] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Content ──────────────────────────────────────────────────────────

app.post('/api/generate-content', async (req, res) => {
  const { topic, keywords, tone, wordCount, priority = 5, model } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: 'topic required' });

  console.log(`[content] "${topic}" tone=${tone} words=${wordCount} priority=${priority}`);

  const toneMap = {
    informational: 'інформаційний',
    commercial:    'комерційний',
    expert:        'експертний',
    casual:        'розмовний',
  };

  // Detect niche from topic for expert persona injection
  const topicLower = topic.toLowerCase();
  const expertPersona = (() => {
    if (/адвокат|юрист|право|суд|позов|договір|юридич/.test(topicLower))
      return `Ти — практикуючий адвокат з 15-річним досвідом. Пишеш від першої особи як експерт-практик. Використовуй реальні кейси, посилання на статті законів (ЦКУ, ГКУ, КПК), конкретні цифри з практики. Уникай загальних фраз — тільки практичні поради які знає лише досвідчений юрист.`;
    if (/лікар|медицин|здоров|клінік|лікуван|діагноз|симптом/.test(topicLower))
      return `Ти — практикуючий лікар з 12-річним досвідом. Пишеш як медичний експерт. Використовуй клінічну термінологію з поясненнями, посилання на міжнародні протоколи, реальні клінічні ситуації.`;
    if (/салон|манікюр|педикюр|стрижка|фарбуван|краса|косметолог|масаж/.test(topicLower))
      return `Ти — майстер індустрії краси з 10-річним досвідом. Пишеш як практик: конкретні техніки, бренди матеріалів, типові помилки клієнтів і як їх уникнути.`;
    if (/фінанс|інвестиц|банк|кредит|бюджет|податок|бухгалтер/.test(topicLower))
      return `Ти — фінансовий консультант з 12-річним досвідом. Використовуй реальні цифри, формули розрахунків, посилання на українське законодавство у сфері фінансів.`;
    if (/seo|маркетинг|реклам|контент|smm|просуванн/.test(topicLower))
      return `Ти — SEO-спеціаліст і контент-маркетолог з 8-річним досвідом. Пишеш з конкретними кейсами, цифрами росту трафіку, назвами інструментів.`;
    return `Ти — експерт-практик у своїй ніші з багаторічним досвідом. Пишеш від позиції людини яка щодня працює з цією темою.`;
  })();

  const toneInstructions = {
    informational: 'Стиль: чіткий, структурований, без води. Факти > думки.',
    commercial:    'Стиль: переконливий, акцент на вигодах для читача, м\'який CTA в кожному розділі.',
    expert:        'Стиль: академічно-практичний. Глибокий аналіз, посилання на джерела, терміни з поясненнями. Читач — фахівець.',
    casual:        'Стиль: розмовний, як пояснення другу. Прості слова, гумор доречний, без занудства.',
  };

  const systemPrompt = `${expertPersona}

ПРАВИЛА НАПИСАННЯ (обов'язково):
- E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness — у кожному абзаці
- Burstiness: чергуй короткі (5-8 слів) і довгі (20-30 слів) речення
- Perplexity: нестандартні метафори, несподівані порівняння, авторський голос
- Конкретика: реальні цифри, дати, назви, кейси — жодних "багато", "часто", "деякі"
- ${toneInstructions[tone] || toneInstructions.informational}

ЗАБОРОНЕНІ штампи (не використовувати НІКОЛИ):
"В сучасному світі", "Важливо зазначити", "Слід відмітити", "Таким чином",
"На сьогоднішній день", "Є очевидним", "Не можна не відмітити",
"Розглянемо детальніше", "Підводячи підсумок", "В даній статті"

Відповідай ТІЛЬКИ готовим текстом статті у Markdown. Без вступних слів типу "Ось стаття:".`;

  const userPrompt = `Напиши SEO-статтю на тему: "${topic}"
Обсяг: ~${wordCount} слів
Тон: ${toneMap[tone] || tone}
${keywords ? `Ключові слова (вжити природно, щільність 1.5–2.5%): ${keywords}` : ''}

Структура:
- Заголовок H1 (потужний, з ключовим словом, інтригуючий)
- Вступ: сильний хук — конкретний факт, цифра або провокаційне питання (НЕ "В сучасному світі")
- 5–7 розділів H2 з підрозділами H3 де доречно
- Мінімум 1-2 таблиці з реальними даними
- Марковані списки для перерахувань (не більше 7 пунктів)
- Блок FAQ: 4-5 питань які реально ставлять клієнти — з несподіваними, практичними відповідями
- Висновок з конкретним CTA (не загальним "звертайтесь до нас")

Пиши як практик, не як енциклопедія.`;

  const chosenModel = model || GEMINI_MODEL;
  try {
    const result = await runWithPriority(Number(priority) || 5, () => callGemini(systemPrompt, userPrompt, chosenModel));
    res.json({ content: result, modelUsed: chosenModel });
  } catch (e) {
    console.error('[content] error:', e.message);
    const isOverload = e.code === OVERLOAD_ERROR;
    res.status(isOverload ? 503 : 500).json({ error: e.message, overloaded: isOverload });
  }
});

// ── LSI / TF-IDF Analyzer ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  // Ukrainian
  'та', 'і', 'й', 'або', 'але', 'що', 'як', 'це', 'він', 'вона', 'вони', 'ми', 'ви', 'я',
  'не', 'до', 'в', 'на', 'з', 'за', 'від', 'по', 'про', 'для', 'при', 'через', 'між',
  'ще', 'вже', 'якщо', 'коли', 'який', 'яка', 'яке', 'які', 'де', 'там', 'тут',
  'може', 'буде', 'був', 'була', 'було', 'є', 'цей', 'ця', 'ці', 'той', 'ті',
  'також', 'тому', 'тільки', 'навіть', 'його', 'її', 'їх', 'наш', 'ваш', 'свій',
  'всі', 'всіх', 'всього', 'кожен', 'цього', 'цьому', 'ним', 'нам', 'нас',
  'так', 'ні', 'чи', 'дуже', 'більш', 'менш', 'більше', 'менше', 'просто',
  'потрібно', 'можна', 'варто', 'треба', 'тобто', 'адже', 'адже', 'тому',
  'нові', 'нова', 'новий', 'нового', 'перший', 'перша', 'перше', 'один',
  // Russian
  'и', 'в', 'не', 'на', 'с', 'что', 'по', 'это', 'из', 'как', 'за', 'но',
  'от', 'же', 'все', 'так', 'при', 'или', 'до', 'для', 'без', 'был', 'его',
  // English
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was', 'with',
  'that', 'this', 'from', 'have', 'more', 'most', 'only', 'than', 'then', 'they',
  'will', 'your', 'our', 'its', 'has', 'been', 'which', 'also', 'into', 'their',
]);

function extractTextFromPage(html) {
  try {
    const root = parse(html);
    for (const tag of ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']) {
      root.querySelectorAll(tag).forEach((el) => el.remove());
    }
    return (root.querySelector('main, article, .content, #content, body')?.text || root.querySelector('body')?.text || '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  } catch {
    return '';
  }
}

function tokenize(text) {
  return text
    .replace(/[«»""''.,!?;:()\[\]{}<>\/\\|@#$%^&*+=~`]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[-–—]|[-–—]$/g, '').toLowerCase())
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));
}

app.post('/api/lsi-analyze', async (req, res) => {
  const { keyword, region } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  console.log(`[lsi] "${keyword}" region=${region}`);

  let serpResults;
  try {
    serpResults = await fetchSerpFromSearXNG(keyword, region || 'ua');
  } catch (e) {
    return res.status(503).json({ error: 'SearXNG недоступний: ' + e.message });
  }
  if (!serpResults?.length) return res.status(404).json({ error: 'Немає результатів пошуку' });

  const urls = serpResults.slice(0, 10).map((r) => r.url || r.link || '').filter(Boolean);

  // Fetch and extract text from each page
  const texts = await Promise.all(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
          signal: AbortSignal.timeout(7000),
        });
        if (!r.ok) return '';
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('text/html')) return '';
        return extractTextFromPage(await r.text());
      } catch {
        return '';
      }
    })
  );

  const validTexts = texts.filter((t) => t.length > 100);
  console.log(`[lsi] Got text from ${validTexts.length}/${urls.length} pages`);

  // Count term frequencies
  const totalFreq = {};
  const docFreq = {};

  for (const text of validTexts) {
    const tokens = tokenize(text);
    const seen = new Set();
    for (const token of tokens) {
      totalFreq[token] = (totalFreq[token] || 0) + 1;
      if (!seen.has(token)) {
        docFreq[token] = (docFreq[token] || 0) + 1;
        seen.add(token);
      }
    }
  }

  // Remove the keyword itself and its parts
  const kwParts = keyword.toLowerCase().split(/\s+/);

  // Build word list sorted by document frequency (more reliable than raw count)
  const words = Object.entries(totalFreq)
    .filter(([word]) => !kwParts.some((p) => word.includes(p) || p.includes(word)))
    .filter(([, tf]) => tf >= 3)
    .map(([word, tf]) => ({
      word,
      totalFreq: tf,
      docFreq: docFreq[word] || 0,
      // Recommend using the word once per ~600 words of article
      recommended: Math.max(1, Math.round((docFreq[word] / validTexts.length) * 3)),
    }))
    .sort((a, b) => b.docFreq - a.docFreq || b.totalFreq - a.totalFreq)
    .slice(0, 60);

  res.json({ keyword, words, pagesAnalyzed: validTexts.length });
});

// ── Keywords Research (DataForSEO + SearXNG + Claude CLI clustering) ─────────

app.post('/api/keywords-research', async (req, res) => {
  try {
    const { keyword, region = 'ua' } = req.body;
    if (!keyword?.trim()) return res.status(400).json({ error: 'keyword обязателен' });

    console.log(`[keywords] "${keyword}" region=${region}`);

    // ── 1. SE Ranking API — similar keywords (most reliable) ───────────────────
    const serHeaders = { 'Authorization': `Token ${SERANKING_API_KEY}` };
    const serBase = 'https://api.seranking.com/v1/keywords';
    const kwParam = encodeURIComponent(keyword.trim());

    // Функция для получения всех страниц с пагинацией
    const fetchAllKeywords = async (endpoint, maxPages = 10) => {
      const allKeywords = [];
      let offset = 0;
      const limit = 1000; // Максимальный лимит на запрос

      for (let page = 0; page < maxPages; page++) {
        try {
          const url = `${serBase}/${endpoint}?source=${region}&keyword=${kwParam}&limit=${limit}&offset=${offset}`;
          const response = await fetch(url, {
            headers: serHeaders,
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) {
            console.warn(`[keywords] SE Ranking ${endpoint} page ${page} failed: ${response.status}`);
            break;
          }

          const data = await response.json();
          const keywords = data.keywords || [];

          if (keywords.length === 0) break; // Больше данных нет

          allKeywords.push(...keywords);
          console.log(`[keywords] SE Ranking ${endpoint} page ${page}: ${keywords.length} items (total: ${allKeywords.length})`);

          // Если получили меньше чем limit, значит это последняя страница
          if (keywords.length < limit) break;

          offset += limit;
        } catch (err) {
          console.warn(`[keywords] SE Ranking ${endpoint} page ${page} error:`, err.message);
          break;
        }
      }

      return allKeywords;
    };

    // Получаем ВСЕ данные из SE Ranking
    const tasks = [
      fetchAllKeywords('similar', 10), // До 10 страниц = 10000 ключевых слов
    ];

    const [similarKeywords] = await Promise.all(tasks);

    // ── 2. Collect SE Ranking keywords ───────────────────────────────────────
    const normalize = (item) => ({
      keyword: item.keyword || '',
      volume: Number(item.volume || 0),
      cpc: parseFloat(item.cpc) || 0,
      difficulty: Number(item.difficulty || 0),
      competition: parseFloat(item.competition) || 0,
    });

    let serKeywords = [];
    if (similarKeywords && Array.isArray(similarKeywords)) {
      serKeywords.push(...similarKeywords.map(normalize));
      console.log(`[keywords] SE Ranking total fetched: ${similarKeywords.length} items`);
    } else {
      console.warn('[keywords] SE Ranking similar failed: no data returned');
    }

    // Dedupe by keyword
    serKeywords = [...new Map(serKeywords.map((k) => [k.keyword.toLowerCase(), k])).values()]
      .filter((k) => k.keyword);

    const serAvailable = serKeywords.length > 0;
    const totalKeywords = serKeywords.length;
    console.log(`[keywords] SE Ranking total unique: ${totalKeywords}`);

    // Приоритизация: сортируем по volume (главное) и cpc (вторично)
    // Ограничиваем до 3000 ключевых слов для оптимальной скорости кластеризации
    const MAX_KEYWORDS = 3000;
    if (serKeywords.length > MAX_KEYWORDS) {
      serKeywords.sort((a, b) => {
        // Сначала по volume DESC, затем по cpc DESC
        const volumeDiff = b.volume - a.volume;
        if (volumeDiff !== 0) return volumeDiff;
        return b.cpc - a.cpc;
      });
      serKeywords = serKeywords.slice(0, MAX_KEYWORDS);
      console.log(`[keywords] Ограничено до топ ${MAX_KEYWORDS} ключевых слов (из ${totalKeywords})`);
    }

    // ── 3. Build Gemini prompt ─────────────────────────────────────────────────
    let claudePrompt;

    if (serAvailable) {
      // Mode A: SE Ranking provided real keywords — cluster + annotate
      claudePrompt = `Ти — експерт з SEO та PPC. Тобі надано список реальних ключових слів (дані SE Ranking) для запиту "${keyword.trim()}".

КЛЮЧОВІ СЛОВА З МЕТРИКАМИ (JSON):
${JSON.stringify(serKeywords)}

ЗАДАЧА:
1. ВАЖЛИВО: Включи ВСІ надані ключові слова в кластери (всього ${serKeywords.length} ключів). Не відкидай жодного ключа!
2. Згрупуй ключові слова в тематичні кластери (5-15 кластерів в залежності від кількості ключів)
3. Для кожного кластера визнач intent: "Комерційний", "Інформаційний", "Навігаційний" або "Локальний"
4. Для кожного ключа додай:
   - bid_recommendation: "Висока ставка (конкурентно)" якщо cpc > 0.6, "Середня ставка" якщо 0.3-0.6, "Низька ставка / Експеримент" якщо < 0.3
   - ad_type: Комерційний → "RSA — ціна/знижка/КП, заклик купити", Локальний → "RSA + локальне розширення", інші → "RSA — навчальний контент, кейси, демо"
   - seo_priority: "Високий" якщо difficulty < 20 і volume > 100, "Середній" якщо difficulty 20-40, "Низький / Довгостроково" якщо difficulty > 40
5. Для кожного кластера: total_volume (сума), avg_cpc (середнє, 2 знаки), avg_difficulty (середнє, ціле), priority_score = round(total_volume * 0.5 + avg_cpc * 100 * 0.3 + (100 - avg_difficulty) * 0.2)
6. Відсортуй кластери за priority_score DESC

ВІДПОВІДЬ — ТІЛЬКИ валідний JSON:
{"clusters":[{"name":"назва кластера","intent":"Комерційний","total_volume":500,"avg_cpc":0.45,"avg_difficulty":22,"priority_score":287,"keywords":[{"keyword":"...","volume":100,"cpc":0.5,"difficulty":20,"competition":0.4,"bid_recommendation":"Середня ставка","ad_type":"RSA — ціна/знижка/КП, заклик купити","seo_priority":"Середній"}]}]}`;

    } else {
      // Mode B fallback: no SE Ranking data — Gemini generates estimates
      claudePrompt = `Ти — експерт з SEO та PPC. Задача: згенерувати розширену семантику для запиту "${keyword.trim()}".

ЗАДАЧА:
1. Згенеруй 40-50 ключових слів на основі seed-запиту.
   Включи: точне входження, широку відповідність, інформаційні, комерційні запити, питання, long-tail.
2. Згрупуй їх у тематичні кластери (4-8 кластерів).
3. Для кожного кластера визнач intent: "Комерційний", "Інформаційний", "Навігаційний" або "Локальний".
4. Для кожного ключа проставь РЕАЛІСТИЧНІ оціночні метрики:
   - volume: ціле число (0-100000)
   - cpc: число з 2 знаками (USD, 0.05-3.00)
   - difficulty: 0-100
   - competition: 0.0-1.0
   - bid_recommendation: "Висока ставка (конкурентно)" якщо cpc > 0.6, "Середня ставка" якщо 0.3-0.6, "Низька ставка / Експеримент" якщо < 0.3
   - ad_type: Комерційний → "RSA — ціна/знижка/КП, заклик купити", Локальний → "RSA + локальне розширення", інші → "RSA — навчальний контент, кейси, демо"
   - seo_priority: "Високий" якщо difficulty < 20 і volume > 100, "Середній" якщо difficulty 20-40, "Низький / Довгостроково" якщо difficulty > 40
5. Для кожного кластера: total_volume, avg_cpc, avg_difficulty, priority_score = round(total_volume * 0.5 + avg_cpc * 100 * 0.3 + (100 - avg_difficulty) * 0.2)
6. Відсортуй за priority_score DESC

ВІДПОВІДЬ — ТІЛЬКИ валідний JSON:
{"clusters":[{"name":"назва кластера","intent":"Комерційний","total_volume":500,"avg_cpc":0.45,"avg_difficulty":22,"priority_score":287,"keywords":[{"keyword":"...","volume":100,"cpc":0.5,"difficulty":20,"competition":0.4,"bid_recommendation":"Середня ставка","ad_type":"RSA — ціна/знижка/КП, заклик купити","seo_priority":"Середній"}]}]}`;
    }

    // ── 5. Claude CLI clustering (JSON mode, with retries) ─────────────────────
    let parsed;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[keywords] Claude CLI clustering attempt ${attempt}/3`);
        const claudeResponse = await claudeCLI.runSimple(claudePrompt, true);

        // Parse JSON response
        parsed = JSON.parse(claudeResponse);
        console.log(`[keywords] Claude CLI успішно кластеризував ${parsed.clusters?.length || 0} кластерів`);
        break;
      } catch (e) {
        if (attempt < 3) {
          console.warn(`[keywords] Claude CLI помилка спроба ${attempt}/3: ${e.message}`);
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        console.error('[keywords] Claude CLI clustering error:', e.message);
        return res.status(500).json({ error: 'Помилка кластеризації: ' + e.message });
      }
    }

    const allKw = (parsed.clusters ?? []).flatMap((c) => c.keywords ?? []);
    console.log(`[keywords] Clustered: ${parsed.clusters?.length ?? 0} clusters, ${allKw.length} keywords, mode=${serAvailable ? 'seranking' : 'ai-generated'}`);

    res.json({
      seed: keyword.trim(),
      region,
      clusters: parsed.clusters ?? [],
      total_keywords: allKw.length,
      sources: {
        seranking: serAvailable,
        mode: serAvailable ? 'seranking+claude' : 'claude-only',
      },
      timestamp: Date.now(),
    });

  } catch (err) {
    console.error('[keywords] unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Keywords Research + Excel Export ──────────────────────────────────────────

app.post('/api/keywords-research-excel', async (req, res) => {
  try {
    const { keyword, region = 'ua' } = req.body;
    if (!keyword?.trim()) return res.status(400).json({ error: 'keyword обязателен' });

    console.log(`[keywords-excel] "${keyword}" region=${region}`);

    // ── 1. SE Ranking API — similar keywords (most reliable) ───────────────────
    const serHeaders = { 'Authorization': `Token ${SERANKING_API_KEY}` };
    const serBase = 'https://api.seranking.com/v1/keywords';
    const kwParam = encodeURIComponent(keyword.trim());

    // Функция для получения всех страниц с пагинацией
    const fetchAllKeywords = async (endpoint, maxPages = 10) => {
      const allKeywords = [];
      let offset = 0;
      const limit = 1000; // Максимальный лимит на запрос

      for (let page = 0; page < maxPages; page++) {
        try {
          const url = `${serBase}/${endpoint}?source=${region}&keyword=${kwParam}&limit=${limit}&offset=${offset}`;
          const response = await fetch(url, {
            headers: serHeaders,
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) {
            console.warn(`[keywords-excel] SE Ranking ${endpoint} page ${page} failed: ${response.status}`);
            break;
          }

          const data = await response.json();
          const keywords = data.keywords || [];

          if (keywords.length === 0) break; // Больше данных нет

          allKeywords.push(...keywords);
          console.log(`[keywords-excel] SE Ranking ${endpoint} page ${page}: ${keywords.length} items (total: ${allKeywords.length})`);

          // Если получили меньше чем limit, значит это последняя страница
          if (keywords.length < limit) break;

          offset += limit;
        } catch (err) {
          console.warn(`[keywords-excel] SE Ranking ${endpoint} page ${page} error:`, err.message);
          break;
        }
      }

      return allKeywords;
    };

    // Получаем ВСЕ данные из SE Ranking
    const tasks = [
      fetchAllKeywords('similar', 10), // До 10 страниц = 10000 ключевых слов
    ];

    const [similarKeywords] = await Promise.all(tasks);

    // ── 2. Collect SE Ranking keywords ───────────────────────────────────────
    const normalize = (item) => ({
      keyword: item.keyword || '',
      volume: Number(item.volume || 0),
      cpc: parseFloat(item.cpc) || 0,
      difficulty: Number(item.difficulty || 0),
      competition: parseFloat(item.competition) || 0,
    });

    let serKeywords = [];
    if (similarKeywords && Array.isArray(similarKeywords)) {
      serKeywords.push(...similarKeywords.map(normalize));
      console.log(`[keywords-excel] SE Ranking total fetched: ${similarKeywords.length} items`);
    } else {
      console.warn('[keywords-excel] SE Ranking similar failed: no data returned');
    }

    // Dedupe by keyword
    serKeywords = [...new Map(serKeywords.map((k) => [k.keyword.toLowerCase(), k])).values()]
      .filter((k) => k.keyword);

    const serAvailable = serKeywords.length > 0;
    const totalKeywords = serKeywords.length;
    console.log(`[keywords-excel] SE Ranking total unique: ${totalKeywords}`);

    if (!serAvailable) {
      return res.status(400).json({ error: 'Не вдалося отримати дані з SE Ranking' });
    }

    // Приоритизация: сортируем по volume (главное) и cpc (вторично)
    // Ограничиваем до 3000 ключевых слов для оптимальной скорости кластеризации
    const MAX_KEYWORDS = 3000;
    if (serKeywords.length > MAX_KEYWORDS) {
      serKeywords.sort((a, b) => {
        // Сначала по volume DESC, затем по cpc DESC
        const volumeDiff = b.volume - a.volume;
        if (volumeDiff !== 0) return volumeDiff;
        return b.cpc - a.cpc;
      });
      serKeywords = serKeywords.slice(0, MAX_KEYWORDS);
      console.log(`[keywords-excel] Ограничено до топ ${MAX_KEYWORDS} ключевых слов (из ${totalKeywords})`);
    }

    // ── 3. Build Claude prompt ─────────────────────────────────────────────────
    const claudePrompt = `Ти — експерт з SEO та PPC. Тобі надано список реальних ключових слів (дані SE Ranking) для запиту "${keyword.trim()}".

КЛЮЧОВІ СЛОВА З МЕТРИКАМИ (JSON):
${JSON.stringify(serKeywords)}

ЗАДАЧА:
1. Згрупуй ключові слова в тематичні кластери (3-15 кластерів, залежно від кількості ключів)
2. Для кожного кластера визнач intent: "Комерційний", "Інформаційний", "Навігаційний" або "Локальний"
3. Для кожного ключа додай:
   - bid_recommendation: "Висока ставка (конкурентно)" якщо cpc > 0.6, "Середня ставка" якщо 0.3-0.6, "Низька ставка / Експеримент" якщо < 0.3
   - ad_type: Комерційний → "RSA — ціна/знижка/КП, заклик купити", Локальний → "RSA + локальне розширення", інші → "RSA — навчальний контент, кейси, демо"
   - seo_priority: "Високий" якщо difficulty < 20 і volume > 100, "Середній" якщо difficulty 20-40, "Низький / Довгостроково" якщо difficulty > 40
4. Для кожного кластера: total_volume (сума), avg_cpc (середнє, 2 знаки), avg_difficulty (середнє, ціле), priority_score = round(total_volume * 0.5 + avg_cpc * 100 * 0.3 + (100 - avg_difficulty) * 0.2)
5. Відсортуй кластери за priority_score DESC

ВІДПОВІДЬ — ТІЛЬКИ валідний JSON:
{"clusters":[{"name":"назва кластера","intent":"Комерційний","total_volume":500,"avg_cpc":0.45,"avg_difficulty":22,"priority_score":287,"keywords":[{"keyword":"...","volume":100,"cpc":0.5,"difficulty":20,"competition":0.4,"bid_recommendation":"Середня ставка","ad_type":"RSA — ціна/знижка/КП, заклик купити","seo_priority":"Середній"}]}]}`;

    // ── 4. Claude CLI clustering (JSON mode, with retries) ─────────────────────
    let parsed;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[keywords-excel] Claude CLI clustering attempt ${attempt}/3`);
        const claudeResponse = await claudeCLI.runSimple(claudePrompt, true);

        // Parse JSON response
        parsed = JSON.parse(claudeResponse);
        console.log(`[keywords-excel] Claude CLI успішно кластеризував ${parsed.clusters?.length || 0} кластерів`);
        break;
      } catch (e) {
        if (attempt < 3) {
          console.warn(`[keywords-excel] Claude CLI помилка спроба ${attempt}/3: ${e.message}`);
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        console.error('[keywords-excel] Claude CLI clustering error:', e.message);
        return res.status(500).json({ error: 'Помилка кластеризації: ' + e.message });
      }
    }

    const allKw = (parsed.clusters ?? []).flatMap((c) => c.keywords ?? []);
    console.log(`[keywords-excel] Clustered: ${parsed.clusters?.length ?? 0} clusters, ${allKw.length} keywords`);

    // ── 5. Generate Excel file ──────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Кластеризація ключових слів');

    // Стилі заголовків
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Заголовки колонок
    worksheet.columns = [
      { header: 'Кластер', key: 'cluster', width: 30 },
      { header: 'Intent', key: 'intent', width: 15 },
      { header: 'Ключове слово', key: 'keyword', width: 40 },
      { header: 'Volume', key: 'volume', width: 12 },
      { header: 'CPC ($)', key: 'cpc', width: 10 },
      { header: 'Difficulty', key: 'difficulty', width: 12 },
      { header: 'Competition', key: 'competition', width: 12 },
      { header: 'Bid Recommendation', key: 'bid_recommendation', width: 30 },
      { header: 'Ad Type', key: 'ad_type', width: 50 },
      { header: 'SEO Priority', key: 'seo_priority', width: 20 },
    ];

    // Применяем стиль к заголовкам
    worksheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Заполняем данными
    parsed.clusters.forEach((cluster) => {
      cluster.keywords.forEach((kw, index) => {
        worksheet.addRow({
          cluster: index === 0 ? `${cluster.name}\n(Vol: ${cluster.total_volume}, CPC: $${cluster.avg_cpc}, Diff: ${cluster.avg_difficulty}, Score: ${cluster.priority_score})` : '',
          intent: index === 0 ? cluster.intent : '',
          keyword: kw.keyword,
          volume: kw.volume,
          cpc: kw.cpc,
          difficulty: kw.difficulty,
          competition: kw.competition,
          bid_recommendation: kw.bid_recommendation,
          ad_type: kw.ad_type,
          seo_priority: kw.seo_priority,
        });
      });

      // Пустая строка между кластерами
      worksheet.addRow({});
    });

    // Форматирование
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Пропускаем заголовок
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
        row.alignment = { vertical: 'top', wrapText: true };
      }
    });

    // Генерируем файл
    const buffer = await workbook.xlsx.writeBuffer();

    // Отправляем файл
    // Генерируем безопасное имя файла (только латиница и цифры)
    const safeFilename = `keywords-${keyword.trim().replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(buffer);

    console.log(`[keywords-excel] Excel file generated successfully for "${keyword}"`);

  } catch (err) {
    console.error('[keywords-excel] unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PageSpeed Insights Audit ──────────────────────────────────────────────────

const CRITICAL_AUDITS = [
  { id: 'document-title', label: 'Title сторінки' },
  { id: 'meta-description', label: 'Meta Description' },
  { id: 'image-alt', label: 'Alt-теги зображень' },
  { id: 'link-text', label: 'Анкорний текст посилань' },
  { id: 'viewport', label: 'Мета viewport' },
  { id: 'first-contentful-paint', label: 'First Contentful Paint' },
  { id: 'speed-index', label: 'Speed Index' },
  { id: 'interactive', label: 'Time to Interactive' },
  { id: 'total-blocking-time', label: 'Total Blocking Time' },
  { id: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
  { id: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
  { id: 'is-crawlable', label: 'Індексація роботами' },
  { id: 'robots-txt', label: 'robots.txt' },
  { id: 'canonical', label: 'Canonical URL' },
  { id: 'hreflang', label: 'Hreflang' },
  { id: 'structured-data', label: 'Структуровані дані' },
  { id: 'tap-targets', label: 'Розмір інтерактивних елементів' },
  { id: 'uses-responsive-images', label: 'Адаптивні зображення' },
  { id: 'uses-optimized-images', label: 'Оптимізація зображень' },
  { id: 'render-blocking-resources', label: 'Блокуючі ресурси' },
  { id: 'unused-javascript', label: 'Невикористаний JavaScript' },
  { id: 'unused-css-rules', label: 'Невикористаний CSS' },
];

app.get('/api/pagespeed', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  if (!PAGESPEED_API_KEY) return res.status(500).json({ error: 'PAGESPEED_API_KEY не налаштовано' });

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`;

  console.log(`[pagespeed] Auditing: ${url}`);

  try {
    const r = await fetch(apiUrl, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`PageSpeed API ${r.status}: ${body.slice(0, 200)}`);
    }
    const data = await r.json();

    const cats = data.lighthouseResult?.categories || {};
    const scores = {
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
    };

    const audits = data.lighthouseResult?.audits || {};
    const issues = [];
    for (const { id, label } of CRITICAL_AUDITS) {
      const audit = audits[id];
      if (!audit || audit.score === null || audit.score === undefined) continue;
      if (audit.score >= 0.9) continue;
      // Extract sample failing items from Lighthouse details
      const failingItems = [];
      const details = audit.details;
      if (details?.type === 'table' && Array.isArray(details.items)) {
        for (const item of details.items.slice(0, 5)) {
          const s = item.url || item.source?.url || item.node?.snippet || item.node?.nodeLabel || '';
          if (s) failingItems.push(String(s).slice(0, 120));
        }
      }

      issues.push({
        id,
        type: audit.score < 0.5 ? 'error' : 'warning',
        title: label || audit.title,
        description: (audit.description || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 220),
        displayValue: audit.displayValue || '',
        score: Math.round(audit.score * 100),
        failingItems,
      });
    }

    issues.sort((a, b) => a.score - b.score);
    res.json({ url, scores, issues });
  } catch (e) {
    console.error('[pagespeed] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Semantic Keyword Clustering ───────────────────────────────────────────────

app.post('/api/semantic-cluster', async (req, res) => {
  const { keywords, region } = req.body;
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords array required' });
  }

  const limited = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((k, i, a) => a.indexOf(k) === i)
    .slice(0, 25);

  console.log(`[cluster] Processing ${limited.length} keywords`);

  const keywordUrls = {};
  for (const kw of limited) {
    try {
      const results = await fetchSerpFromSearXNG(kw, region || 'ua');
      keywordUrls[kw] = (results || []).map((r) => r.url || r.link || '').filter(Boolean).slice(0, 10);
      console.log(`[cluster] "${kw}": ${keywordUrls[kw].length} URLs`);
    } catch {
      keywordUrls[kw] = [];
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const THRESHOLD = 3;
  const clusters = [];
  const clustered = new Set();

  for (let i = 0; i < limited.length; i++) {
    const kw = limited[i];
    if (clustered.has(kw)) continue;

    const urlsA = new Set(keywordUrls[kw] || []);
    const cluster = { mainKeyword: kw, keywords: [kw], commonUrls: [] };
    clustered.add(kw);

    for (let j = i + 1; j < limited.length; j++) {
      const kw2 = limited[j];
      if (clustered.has(kw2)) continue;
      const common = (keywordUrls[kw2] || []).filter((u) => urlsA.has(u));
      if (common.length >= THRESHOLD) {
        cluster.keywords.push(kw2);
        if (!cluster.commonUrls.length) cluster.commonUrls = common.slice(0, 3);
        clustered.add(kw2);
      }
    }
    clusters.push(cluster);
  }

  const multiClusters = clusters.filter((c) => c.keywords.length > 1);
  const singles = clusters.filter((c) => c.keywords.length === 1).map((c) => c.mainKeyword);

  res.json({ clusters: multiClusters, unclustered: singles, total: limited.length });
});

// ── Smart Internal Linking ────────────────────────────────────────────────────

app.post('/api/smart-linking', async (req, res) => {
  const { articleText, articles } = req.body;
  if (!articleText?.trim()) return res.status(400).json({ error: 'articleText required' });
  if (!Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: 'articles array required' });
  }

  console.log(`[linking] text=${articleText.length}c, articles=${articles.length}`);

  const articlesList = articles
    .map((a, i) => `${i + 1}. "${a.title}" — ${a.url}`)
    .join('\n');

  const systemPrompt = `Ти — SEO-фахівець зі спеціалізацією на внутрішній перелінковці.
Аналізуєш текст статті та список наявних матеріалів сайту.
Відповідай ТІЛЬКИ валідним JSON масивом без markdown та пояснень.`;

  const userPrompt = `Проаналізуй текст та запропонуй 3-5 місць для внутрішніх посилань.

ТЕКСТ СТАТТІ:
${articleText.slice(0, 3500)}

НАЯВНІ МАТЕРІАЛИ САЙТУ:
${articlesList}

Поверни JSON масив у форматі:
[
  {
    "location": "точне речення або фраза з тексту, де рекомендується посилання",
    "anchor": "анкорний текст (2-4 слова з тексту)",
    "targetUrl": "URL цільової сторінки",
    "targetTitle": "назва цільової сторінки",
    "reason": "коротке пояснення релевантності (1 речення)"
  }
]`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Не вдалося розпізнати JSON у відповіді');
    const suggestions = JSON.parse(jsonMatch[0]);
    res.json({ suggestions });
  } catch (e) {
    console.error('[linking] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Semantic Cluster with SSE Streaming (queue + retry) ───────────────────────

app.post('/api/semantic-cluster-stream', async (req, res) => {
  const { keywords, region } = req.body;
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords array required' });
  }

  const limited = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 5000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (obj) => {
    try {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch {/* client disconnected */}
  };

  send({ type: 'start', total: limited.length });
  console.log(`[cluster-stream] Processing ${limited.length} keywords`);

  const keywordUrls = {};
  const startTime = Date.now();

  for (let i = 0; i < limited.length; i++) {
    if (req.socket?.destroyed) break;

    const kw = limited[i];
    let results = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        results = await fetchSerpFromSearXNG(kw, region || 'ua');
        break;
      } catch (e) {
        const backoff = e.message?.includes('429') ? 12000 : 3000 * (attempt + 1);
        if (attempt < 2) {
          console.warn(`[cluster-stream] retry ${attempt + 1}/3 for "${kw}", wait ${backoff}ms`);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    keywordUrls[kw] = (results || []).map((r) => r.url || r.link || '').filter(Boolean).slice(0, 10);

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (i + 1) / elapsed;
    const eta = Math.round((limited.length - i - 1) / rate);

    send({ type: 'progress', done: i + 1, total: limited.length, keyword: kw, eta });

    if (i < limited.length - 1) {
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    }
  }

  // Clustering
  const THRESHOLD = 3;
  const clusters = [];
  const clustered = new Set();
  for (let i = 0; i < limited.length; i++) {
    const kw = limited[i];
    if (clustered.has(kw)) continue;
    const urlsA = new Set(keywordUrls[kw] || []);
    const cluster = { mainKeyword: kw, keywords: [kw], commonUrls: [] };
    clustered.add(kw);
    for (let j = i + 1; j < limited.length; j++) {
      const kw2 = limited[j];
      if (clustered.has(kw2)) continue;
      const common = (keywordUrls[kw2] || []).filter((u) => urlsA.has(u));
      if (common.length >= THRESHOLD) {
        cluster.keywords.push(kw2);
        if (!cluster.commonUrls.length) cluster.commonUrls = common.slice(0, 3);
        clustered.add(kw2);
      }
    }
    clusters.push(cluster);
  }

  const multiClusters = clusters.filter((c) => c.keywords.length > 1);
  const singles = clusters.filter((c) => c.keywords.length === 1).map((c) => c.mainKeyword);

  send({ type: 'result', clusters: multiClusters, unclustered: singles, total: limited.length });
  res.end();
  console.log(`[cluster-stream] Done: ${multiClusters.length} clusters, ${singles.length} singles`);
});

// ── AI Content Detector (v2 — numeric metrics + patterns) ────────────────────

app.post('/api/ai-detect', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  const wordCount = text.trim().split(/\s+/).length;
  const systemPrompt = `Ти — провідний детектор AI-написаного тексту. Проводиш глибокий лінгвістичний аналіз.
Відповідай ТІЛЬКИ валідним JSON без markdown, без коментарів поза JSON.`;

  const userPrompt = `Проведи глибокий аналіз тексту (${wordCount} слів) і визнач, написаний він людиною чи ШІ.

МЕТРИКИ ДЛЯ ОЦІНКИ:

1. PERPLEXITY (0-100): наскільки непередбачуваний текст
   - 0-30 = дуже передбачуваний (типово для AI): шаблонні фрази, кліше, банальні переходи
   - 31-60 = середня непередбачуваність: є деяка варіативність, але є й шаблони
   - 61-100 = висока непередбачуваність (типово для людини): несподівані метафори, живий стиль

2. BURSTINESS (0-100): різноманітність довжини речень
   - 0-30 = дуже однорідна довжина (AI): всі речення ~15-20 слів, монотонний ритм
   - 31-60 = помірна різноманітність
   - 61-100 = велика різноманітність (людина): є дуже короткі і дуже довгі речення

3. AI_PROBABILITY: загальна ймовірність написання ШІ (0-100, де 100 = точно ШІ)

ТЕКСТ ДЛЯ АНАЛІЗУ:
${text.slice(0, 5000)}

Поверни ТІЛЬКИ JSON без додаткового тексту:
{
  "aiProbability": <число 0-100>,
  "perplexity": <число 0-100>,
  "burstiness": <число 0-100>,
  "repetitive_patterns": ["<шаблонна фраза/конструкція, яка повторюється або типова для AI>", "<ще одна>", "<ще одна>"],
  "verdict": "Написано AI" | "Ймовірно AI" | "Змішаний стиль" | "Ймовірно людина" | "Написано людиною",
  "signals": [
    "<конкретна ознака 1 з прикладом з тексту — напр. 'Всі речення у параграфі 3 мають 15-18 слів'>",
    "<конкретна ознака 2>",
    "<конкретна ознака 3>",
    "<конкретна ознака 4>"
  ]
}`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Не вдалося розпізнати JSON');
    const parsed = JSON.parse(m[0]);
    // Clamp all numeric fields to 0-100
    parsed.aiProbability = Math.max(0, Math.min(100, Number(parsed.aiProbability) || 0));
    parsed.perplexity = Math.max(0, Math.min(100, Number(parsed.perplexity) || 50));
    parsed.burstiness = Math.max(0, Math.min(100, Number(parsed.burstiness) || 50));
    res.json(parsed);
  } catch (e) {
    console.error('[ai-detect] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Plagiarism Stream v2 (sentence-level, 4-5s delay, full text map) ──────────

app.post('/api/plagiarism-stream', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); if (res.flush) res.flush(); } catch { /* disconnected */ }
  };

  // ── 1. Extract all sentences from plain text ───────────────────────────────
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`[\]|]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n');

  // Split on sentence boundaries
  const rawSentences = plain
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => {
      const words = s.split(/\s+/).filter((w) => /[а-яa-z]/i.test(w));
      return words.length >= 6 && s.length >= 35;
    });

  // Deduplicate while preserving order (avoid identical intro sentences)
  const seen = new Set();
  const allSentences = rawSentences.filter((s) => {
    const key = s.slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const MAX_CHECK = 50;
  const toCheck = allSentences.slice(0, MAX_CHECK);

  if (!toCheck.length) {
    send({ type: 'result', uniqueness: 100, sentences: [], sources: [], checked: 0, note: 'Не знайдено придатних речень' });
    return res.end();
  }

  send({ type: 'start', total: toCheck.length });
  console.log(`[plagiarism-stream] Checking ${toCheck.length} sentences (total extracted: ${allSentences.length})`);

  const results = []; // { idx, text, found, urls }
  const allUrls = new Set();
  const startTime = Date.now();

  for (let i = 0; i < toCheck.length; i++) {
    if (req.socket?.destroyed) break;

    const sentence = toCheck[i];
    // Use 5-7 word shingle from the middle of sentence for better precision
    const words = sentence.split(/\s+/);
    const mid = Math.floor(words.length / 2);
    const shingleWords = words.slice(Math.max(0, mid - 3), mid + 4);
    const shingle = shingleWords.length >= 5 ? shingleWords.join(' ') : words.slice(0, 7).join(' ');
    const query = `"${shingle.replace(/"/g, '')}"`;

    let found = false;
    let urls = [];

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const serpRes = await fetchSerpFromSearXNG(query, 'ua');
        found = Array.isArray(serpRes) && serpRes.length > 0;
        if (found) {
          urls = serpRes.slice(0, 3).map((r) => r.url || r.link || '').filter(Boolean);
          urls.forEach((u) => allUrls.add(u));
        }
        break;
      } catch (e) {
        if (e.message?.includes('429') && attempt === 0) {
          console.warn(`[plagiarism-stream] 429 on sentence ${i}, backing off 10s...`);
          await new Promise((r) => setTimeout(r, 10000));
        }
      }
    }

    results.push({ idx: i, text: sentence, found, urls });

    const elapsed = (Date.now() - startTime) / 1000 || 0.1;
    const rate = (i + 1) / elapsed;
    const eta = Math.round((toCheck.length - i - 1) / Math.max(rate, 0.05));

    send({ type: 'progress', done: i + 1, total: toCheck.length, found, eta });

    if (i < toCheck.length - 1) {
      // 4000–5000ms strict delay to avoid IP ban
      await new Promise((r) => setTimeout(r, 4000 + Math.round(Math.random() * 1000)));
    }
  }

  const foundCount = results.filter((r) => r.found).length;
  const uniqueness = results.length > 0
    ? Math.round(((results.length - foundCount) / results.length) * 100)
    : 100;
  const sources = [...allUrls].slice(0, 15);

  send({ type: 'result', uniqueness, sentences: results, sources, checked: results.length });
  res.end();
  console.log(`[plagiarism-stream] Done: ${foundCount}/${results.length} found, uniqueness=${uniqueness}%`);
});

// ── Smart Rewriter (Paraphrase problematic fragments) ─────────────────────────

app.post('/api/rewrite-fragment', async (req, res) => {
  const { fragments } = req.body;
  if (!Array.isArray(fragments) || fragments.length === 0) {
    return res.status(400).json({ error: 'fragments array required' });
  }

  const limited = fragments.slice(0, 20);
  console.log(`[rewrite] ${limited.length} fragments`);

  const systemPrompt = `Ти — провідний редактор-уніказатор. Переписуєш тексти для антиплагіату та обходу AI-детекторів.
Відповідай ТІЛЬКИ валідним JSON масивом рядків без markdown та пояснень поза JSON.`;

  const fragList = limited.map((f, i) => `Фрагмент ${i + 1}:\n"${f}"`).join('\n\n');

  const userPrompt = `Перепиши кожен фрагмент нижче за СТРОГИМИ правилами:

ПРАВИЛА ПЕРЕПИСУВАННЯ:
1. ЗМІСТ — зберегти точно: всі факти, числа, твердження, терміни
2. СТРУКТУРА речень — змінити повністю: інший порядок частин, інші сполучники
3. BURSTINESS — обов'язково чергувати короткі (3-7 слів) і довгі (25-35 слів) речення
4. PERPLEXITY — використати нестандартні синоніми, несподівані звороти, живі метафори
5. ЗАБОРОНЕНО: "Важливо зазначити", "Слід відмітити", "По-перше/По-друге", кліше
6. Мова — та сама, що в оригіналі (зазвичай українська)

${fragList}

Поверни JSON масив — рівно ${limited.length} елементів у тому самому порядку:
["переписаний фрагмент 1", "переписаний фрагмент 2", ...]`;

  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Не вдалося розпізнати JSON масив');
    const rewrites = JSON.parse(m[0]);
    if (!Array.isArray(rewrites)) throw new Error('Відповідь не є масивом');
    res.json({ rewrites: rewrites.slice(0, limited.length) });
  } catch (e) {
    console.error('[rewrite] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── WordPress Publish (proxied to avoid CORS) ─────────────────────────────────

app.post('/api/wp-publish', async (req, res) => {
  const { siteUrl, username, appPassword, title, content, status = 'draft' } = req.body;

  if (!siteUrl || !username || !appPassword || !content?.trim()) {
    return res.status(400).json({ error: 'siteUrl, username, appPassword, content required' });
  }
  if (!title?.trim()) {
    return res.status(400).json({ error: 'title required' });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const wpBase = siteUrl.replace(/\/+$/, '');

  console.log(`[wp-publish] POST ${wpBase}/wp-json/wp/v2/posts title="${title}" status=${status}`);

  try {
    // Step 1: Extract and upload base64 images to WP Media Library
    const base64Regex = /!\[([^\]]*)\]\(data:(image\/[^;]+);base64,([A-Za-z0-9+/=]+)\)/g;
    const matches = [...content.matchAll(base64Regex)];
    let processedContent = content;

    if (matches.length > 0) {
      console.log(`[wp-publish] Uploading ${matches.length} base64 image(s) to WP Media Library`);
      const uploads = await Promise.all(matches.map(async ([fullMatch, altText, mimeType, b64data]) => {
        const ext = mimeType.split('/')[1] || 'png';
        const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        try {
          const imgBuffer = Buffer.from(b64data, 'base64');
          const uploadRes = await fetch(`${wpBase}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Content-Type': mimeType,
            },
            body: imgBuffer,
            signal: AbortSignal.timeout(30000),
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.source_url) {
            console.log(`[wp-publish] Image uploaded: ${uploadData.source_url}`);
            return { fullMatch, url: uploadData.source_url, altText };
          }
          console.error('[wp-publish] image upload failed:', uploadData.message);
          return { fullMatch, url: null, altText };
        } catch (e) {
          console.error('[wp-publish] image upload error:', e.message);
          return { fullMatch, url: null, altText };
        }
      }));

      for (const { fullMatch, url, altText } of uploads) {
        processedContent = url
          ? processedContent.replace(fullMatch, `![${altText}](${url})`)
          : processedContent.replace(fullMatch, '');
      }
    }

    // Step 2: Convert markdown → HTML
    const contentHtml = marked.parse(processedContent, { async: false });

    // Step 3: Publish post
    const wpRes = await fetch(`${wpBase}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: contentHtml, status }),
      signal: AbortSignal.timeout(20000),
    });

    if (wpRes.status === 401)
      return res.status(401).json({ error: 'Невірні облікові дані WordPress. Перевірте логін та Application Password.' });
    if (wpRes.status === 403)
      return res.status(403).json({ error: 'Немає прав на публікацію. Переконайтесь що Application Password має права на Posts.' });
    if (wpRes.status === 404)
      return res.status(404).json({ error: 'WordPress REST API недоступний. Переконайтесь що на сайті увімкнені постійні посилання та REST API.' });
    if (!wpRes.ok) {
      let errMsg = `WordPress повернув помилку ${wpRes.status}`;
      try { const body = await wpRes.json(); errMsg = body?.message || errMsg; } catch {}
      return res.status(wpRes.status).json({ error: errMsg });
    }

    const data = await wpRes.json();
    console.log(`[wp-publish] Success: post id=${data.id} link=${data.link}`);
    res.json({ id: data.id, link: data.link, status: data.status, imagesUploaded: matches.length });

  } catch (e) {
    const msg = e.message || 'Невідома помилка';
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND'))
      return res.status(502).json({ error: `Не вдалося з'єднатися з ${wpBase}. Перевірте URL сайту.` });
    if (msg.includes('TimeoutError') || msg.includes('timeout'))
      return res.status(504).json({ error: 'Сайт WordPress не відповідає (тайм-аут).' });
    console.error('[wp-publish] error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── Fetch competitor headings for OutlineBuilder ──────────────────────────────

app.post('/api/fetch-competitor-headings', async (req, res) => {
  const { keyword, region = 'ua' } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: 'keyword required' });

  console.log(`[headings] fetching for "${keyword}" region=${region}`);

  let serpResults = null;
  try {
    serpResults = await fetchSerpFromSearXNG(keyword.trim(), region);
  } catch (e) {
    return res.status(503).json({ error: 'SearXNG недоступний: ' + e.message });
  }
  if (!serpResults?.length) {
    return res.status(404).json({ error: 'Немає результатів пошуку для цього запиту' });
  }

  const pages = await scrapeCompetitors(serpResults.slice(0, 8));

  const result = pages
    .filter((p) => p.headings?.length > 0)
    .map((p) => {
      let domain = p.url;
      try { domain = new URL(p.url).hostname.replace(/^www\./, ''); } catch {}
      return { url: p.url, domain, headings: p.headings };
    });

  console.log(`[headings] ${result.length} pages with headings`);
  res.json({ pages: result });
});

// ── Projects Module ───────────────────────────────────────────────────────────

app.use('/api/projects', projectsRouter);
app.use('/api/projects/:id/kb', knowledgeBaseRouter);
app.use('/api/projects/:id/hypotheses', hypothesesRouter);
app.use('/api/projects/:id/anomalies', anomaliesRouter);
app.use('/api/projects/:id/content-plan', contentPlanRouter);
app.use('/api/projects/:id/competitors', competitorsRouter);

// ── Content management ────────────────────────────────────────────────────────
app.use('/api/folders',      requireAuth, foldersRouter);
app.use('/api/briefs',       requireAuth, briefsRouter);
app.use('/api/publications',  requireAuth, publicationsRouter);
app.use('/api/shares',        requireAuth, sharesRouter);

// ── Google Search Console ─────────────────────────────────────────────────────
app.use('/api/gsc', gscRouter);

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '127.0.0.1', () => {
  console.log(`ContentForge API  →  http://127.0.0.1:${PORT}`);
  console.log(`  Model  : ${GEMINI_MODEL}`);
  console.log(`  SearXNG: ${SEARXNG_URL}`);
});
