import { Router } from 'express';
import db from '../db/database.js';
import claudeCLI from '../services/ClaudeCLIWrapper.js';
import { anomalyAnalysisFramework } from '../prompts/marketingFrameworks.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/anomalies
router.get('/', (req, res) => {
  const anomalies = db.prepare(`
    SELECT a.*, h.title as hypothesis_title_ref
    FROM anomaly_analyses a
    LEFT JOIN hypotheses h ON h.id = a.hypothesis_id
    WHERE a.project_id = ?
    ORDER BY a.created_at DESC
  `).all(req.params.id);
  res.json(anomalies);
});

// POST /api/projects/:id/anomalies — analyze result + save
router.post('/', async (req, res) => {
  const projectId = req.params.id;
  const { hypothesis_id, description, outcome } = req.body;

  if (!description?.trim()) return res.status(400).json({ error: 'description required' });
  if (!['success', 'failure', 'partial'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be success|failure|partial' });
  }

  let hypothesisTitle = 'Неизвестная гипотеза';
  if (hypothesis_id) {
    const h = db.prepare('SELECT title, description FROM hypotheses WHERE id = ?').get(hypothesis_id);
    if (h) hypothesisTitle = h.title;
  }

  console.log(`[anomalies] Analyzing "${hypothesisTitle}" outcome=${outcome}`);

  const outcomeMap = { success: 'УСПІХ', failure: 'ПРОВАЛ', partial: 'ЧАСТКОВИЙ УСПІХ' };
  const userMessage = `Проаналізуй результат впровадження маркетингової гіпотези.

Гіпотеза: "${hypothesisTitle}"
Результат: ${outcomeMap[outcome]}
Опис результату: ${description}

Використовуй фреймворк Revenue Intelligence + 5 Чому.
Дай конкретні висновки та рекомендації для наступних гіпотез.`;

  let aiConclusion = '';
  try {
    aiConclusion = await claudeCLI.run(projectId, 'anomaly', userMessage, anomalyAnalysisFramework());
  } catch (e) {
    console.warn('[anomalies] Claude CLI error:', e.message);
    aiConclusion = `Аналіз недоступний: ${e.message}`;
  }

  const result = db.prepare(`
    INSERT INTO anomaly_analyses (project_id, hypothesis_id, hypothesis_title, outcome, description, ai_conclusion)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId, hypothesis_id || null, hypothesisTitle, outcome, description, aiConclusion);

  if (hypothesis_id) {
    db.prepare(`
      UPDATE hypotheses SET implementation_result = ?, ai_conclusion = ? WHERE id = ?
    `).run(description, aiConclusion.slice(0, 500), hypothesis_id);
  }

  const saved = db.prepare('SELECT * FROM anomaly_analyses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(saved);
});

// DELETE /api/projects/:id/anomalies/:aid
router.delete('/:aid', (req, res) => {
  db.prepare('DELETE FROM anomaly_analyses WHERE id = ? AND project_id = ?')
    .run(req.params.aid, req.params.id);
  res.json({ deleted: true });
});

export default router;
