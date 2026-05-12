import { Router } from 'express';
import db from '../db/database.js';
import claudeCLI from '../services/ClaudeCLIWrapper.js';
import { hypothesisGenerationFramework } from '../prompts/marketingFrameworks.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/hypotheses
router.get('/', (req, res) => {
  const hypotheses = db.prepare(`
    SELECT * FROM hypotheses
    WHERE project_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);
  res.json(hypotheses);
});

// POST /api/projects/:id/hypotheses/generate — AI generates new hypotheses
router.post('/generate', async (req, res) => {
  const projectId = req.params.id;
  const { focus } = req.body; // optional focus area

  const kb = db.prepare('SELECT * FROM knowledge_base WHERE project_id = ?').get(projectId);
  if (!kb) {
    return res.status(400).json({ error: 'Заповніть Базу знань перед генерацією гіпотез' });
  }

  console.log(`[hypotheses] Generating for project ${projectId}, focus="${focus || 'all'}"`);

  const focusNote = focus ? `\nФокус поточної генерації: ${focus}` : '';
  const userMessage = `Згенеруй 4 маркетингові гіпотези для тестування.${focusNote}
Кожна гіпотеза повинна:
1. Слідувати шаблону "Ми віримо, що..."
2. Мати ICE Score (Impact/Confidence/Ease по 10)
3. Враховувати вже відхилені гіпотези (не повторювати їх)
4. Бути специфічною для нашого продукту і ЦА

Формат кожної гіпотези:
### Гіпотеза [N]: [Коротка назва]
**Формулювання:** Ми віримо, що...
**Категорія:** Acquisition/Activation/Retention/Revenue/Referral
**ICE Score:** Impact: X/10, Confidence: X/10, Ease: X/10, Підсумок: X.X
**Метрик успіху:** [конкретний KPI]
**Строк тесту:** [2–4 тижні]
**Обґрунтування:** [чому це спрацює]`;

  try {
    const result = await claudeCLI.run(projectId, 'hypotheses', userMessage, hypothesisGenerationFramework());

    // Parse and auto-save generated hypotheses to DB
    const saved = parseAndSaveHypotheses(projectId, result);

    res.json({ raw: result, saved });
  } catch (e) {
    console.error('[hypotheses] generate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects/:id/hypotheses/:hid/accept
router.post('/:hid/accept', (req, res) => {
  const { hid, id: projectId } = req.params;
  const h = db.prepare('SELECT * FROM hypotheses WHERE id = ? AND project_id = ?').get(hid, projectId);
  if (!h) return res.status(404).json({ error: 'Hypothesis not found' });

  db.prepare(`UPDATE hypotheses SET status = 'accepted', rejection_reason = NULL WHERE id = ?`).run(hid);
  res.json(db.prepare('SELECT * FROM hypotheses WHERE id = ?').get(hid));
});

// POST /api/projects/:id/hypotheses/:hid/reject
router.post('/:hid/reject', (req, res) => {
  const { hid, id: projectId } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'rejection reason required' });

  const h = db.prepare('SELECT * FROM hypotheses WHERE id = ? AND project_id = ?').get(hid, projectId);
  if (!h) return res.status(404).json({ error: 'Hypothesis not found' });

  db.prepare(`UPDATE hypotheses SET status = 'rejected', rejection_reason = ? WHERE id = ?`).run(reason.trim(), hid);
  res.json(db.prepare('SELECT * FROM hypotheses WHERE id = ?').get(hid));
});

// DELETE /api/projects/:id/hypotheses/:hid
router.delete('/:hid', (req, res) => {
  db.prepare('DELETE FROM hypotheses WHERE id = ? AND project_id = ?').run(req.params.hid, req.params.id);
  res.json({ deleted: true });
});

// ── Helper: parse markdown hypotheses and save to DB ─────────────────────────
function parseAndSaveHypotheses(projectId, markdown) {
  const blocks = markdown.split(/### Гіпотеза \d+:/);
  const saved = [];

  for (const block of blocks.slice(1)) {
    const lines = block.trim().split('\n');
    const titleLine = lines[0]?.trim() || 'Без названия';
    const title = titleLine.replace(/^\*+|\*+$/g, '').trim();

    if (!title || title.length < 3) continue;

    const result = db.prepare(`
      INSERT INTO hypotheses (project_id, title, description, framework_used, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(projectId, title.slice(0, 200), block.trim().slice(0, 2000), 'growth-engine');

    saved.push({ id: result.lastInsertRowid, title });
  }

  return saved;
}

export default router;
