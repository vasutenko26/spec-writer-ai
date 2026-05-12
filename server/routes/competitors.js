import { Router } from 'express';
import { parse } from 'node-html-parser';
import db from '../db/database.js';
import claudeCLI from '../services/ClaudeCLIWrapper.js';
import { competitorIntelFramework } from '../prompts/marketingFrameworks.js';

const router = Router({ mergeParams: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

// GET /api/projects/:id/competitors — list reports
router.get('/', (req, res) => {
  const reports = db.prepare(`
    SELECT id, query, ai_report, created_at FROM competitor_reports
    WHERE project_id = ? ORDER BY created_at DESC
  `).all(req.params.id);
  res.json(reports);
});

// GET /api/projects/:id/competitors/:rid — single report
router.get('/:rid', (req, res) => {
  const report = db.prepare('SELECT * FROM competitor_reports WHERE id = ? AND project_id = ?')
    .get(req.params.rid, req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

// POST /api/projects/:id/competitors/analyze
router.post('/analyze', async (req, res) => {
  const projectId = req.params.id;
  const { urls, query } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' });
  }
  if (!query?.trim()) {
    return res.status(400).json({ error: 'query required' });
  }

  console.log(`[competitors] Analyzing ${urls.length} URLs for project ${projectId}`);

  // ── 1. Scrape competitor pages ─────────────────────────────────────────────
  const scraped = await Promise.all(
    urls.slice(0, 8).map((url) => scrapeCompetitorPage(url))
  );

  const validPages = scraped.filter(Boolean);
  const rawData = JSON.stringify(validPages, null, 2);

  // ── 2. Build analysis prompt ───────────────────────────────────────────────
  const pagesText = validPages.map((p, i) => `
Конкурент ${i + 1}: ${p.url}
- Заголовок: ${p.title}
- Слов: ${p.wordCount}
- H1: ${p.h1.join(', ') || '—'}
- H2 (топ-5): ${p.h2.slice(0, 5).join(' | ') || '—'}
- Описание: ${p.description || '—'}
- Есть CTA: ${p.ctaCount > 0 ? `да (${p.ctaCount})` : 'нет'}
- Форм: ${p.formCount}
`).join('\n');

  const userMessage = `Проаналізуй конкурентів за запитом/нішею: "${query}"

ДАНІ СТОРІНОК КОНКУРЕНТІВ:
${pagesText}

Використовуй фреймворки SEO-Ops і Conversion-Ops.
Знайди слабкі місця конкурентів, прогалини ринку та конкретні можливості для нашого проєкту.`;

  let aiReport = '';
  try {
    aiReport = await claudeCLI.run(projectId, 'competitors', userMessage, competitorIntelFramework());
  } catch (e) {
    console.warn('[competitors] Claude CLI error:', e.message);
    aiReport = `Аналіз недоступний: ${e.message}\n\nЗібрані дані:\n${pagesText}`;
  }

  const result = db.prepare(`
    INSERT INTO competitor_reports (project_id, query, raw_data, ai_report)
    VALUES (?, ?, ?, ?)
  `).run(projectId, query.trim(), rawData, aiReport);

  const saved = db.prepare('SELECT * FROM competitor_reports WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(saved);
});

// DELETE /api/projects/:id/competitors/:rid
router.delete('/:rid', (req, res) => {
  db.prepare('DELETE FROM competitor_reports WHERE id = ? AND project_id = ?')
    .run(req.params.rid, req.params.id);
  res.json({ deleted: true });
});

// ── Scraper ───────────────────────────────────────────────────────────────────

async function scrapeCompetitorPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'ru,uk;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return null;

    const html = await res.text();
    const root = parse(html);
    for (const tag of ['script', 'style', 'nav', 'footer', 'aside', 'noscript']) {
      root.querySelectorAll(tag).forEach((el) => el.remove());
    }

    const bodyText = (root.querySelector('body')?.text || '').replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    const getTexts = (tag) =>
      root.querySelectorAll(tag).map((el) => el.text.replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 300);

    const description = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ctaKeywords = /купить|заказать|попробовать|подписаться|скачать|начать|зарегистр|buy|order|get started|sign up|download/i;
    const ctaCount = root.querySelectorAll('a, button').filter((el) => ctaKeywords.test(el.text)).length;

    return {
      url,
      title: (root.querySelector('title')?.text || '').trim().slice(0, 150),
      description: description.slice(0, 300),
      wordCount,
      h1: getTexts('h1').slice(0, 3),
      h2: getTexts('h2').slice(0, 10),
      h3: getTexts('h3').slice(0, 8),
      formCount: root.querySelectorAll('form').length,
      ctaCount,
    };
  } catch (e) {
    console.warn(`[competitors] scrape failed: ${url} — ${e.message}`);
    return null;
  }
}

export default router;
