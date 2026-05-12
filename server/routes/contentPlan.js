import { Router } from 'express';
import db from '../db/database.js';
import claudeCLI from '../services/ClaudeCLIWrapper.js';
import { contentPlanFramework } from '../prompts/marketingFrameworks.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/content-plan
router.get('/', (req, res) => {
  const plans = db.prepare(`
    SELECT * FROM content_plans WHERE project_id = ? ORDER BY created_at DESC
  `).all(req.params.id);
  res.json(plans);
});

// GET /api/projects/:id/content-plan/:pid — single plan
router.get('/:pid', (req, res) => {
  const plan = db.prepare('SELECT * FROM content_plans WHERE id = ? AND project_id = ?')
    .get(req.params.pid, req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

// POST /api/projects/:id/content-plan/generate — AI generates plan
router.post('/generate', async (req, res) => {
  const projectId = req.params.id;
  const { period = '30 дней', platforms, goals } = req.body;

  const kb = db.prepare('SELECT * FROM knowledge_base WHERE project_id = ?').get(projectId);
  if (!kb) {
    return res.status(400).json({ error: 'Заповніть Базу знань перед генерацією контент-плану' });
  }

  console.log(`[content-plan] Generating for project ${projectId}, period="${period}"`);

  const platformNote = platforms ? `Платформы: ${platforms}` : '';
  const goalsNote = goals ? `Цели кампании: ${goals}` : '';

  const userMessage = `Створи детальний контент-план на ${period}.

${platformNote}
${goalsNote}

Використовуй методологію Content-Eval: 20+ ідей з оцінкою за 7 експертними лінзами.

ОБОВ'ЯЗКОВА СТРУКТУРА ВИВОДУ:

## 📊 Зведена таблиця ідей
| # | Тема | Формат | Платформа | Воронка | Score |
(мінімум 20 рядків, Score за шкалою 0–100)

## 📅 Тижневий календар (4 тижні)
Для кожного поста вкажи:
- День і дата
- Тему і формат
- Хук (перші 2 речення)
- CTA

## 🎯 Топ-5 пріоритетних матеріалів
З детальним планом: мета, структура, ключові тези

## 📈 KPI та метрики успіху`;

  try {
    const rawText = await claudeCLI.run(projectId, 'content_plan', userMessage, contentPlanFramework());

    const result = db.prepare(`
      INSERT INTO content_plans (project_id, title, period, raw_text)
      VALUES (?, ?, ?, ?)
    `).run(projectId, `Контент-план на ${period}`, period, rawText);

    const saved = db.prepare('SELECT * FROM content_plans WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(saved);
  } catch (e) {
    console.error('[content-plan] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/projects/:id/content-plan/:pid
router.delete('/:pid', (req, res) => {
  db.prepare('DELETE FROM content_plans WHERE id = ? AND project_id = ?')
    .run(req.params.pid, req.params.id);
  res.json({ deleted: true });
});

export default router;
