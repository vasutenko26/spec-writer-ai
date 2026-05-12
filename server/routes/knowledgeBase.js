import { Router } from 'express';
import db from '../db/database.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/kb
router.get('/', (req, res) => {
  const kb = db.prepare('SELECT * FROM knowledge_base WHERE project_id = ?').get(req.params.id);
  res.json(kb || {});
});

// PUT /api/projects/:id/kb — upsert
router.put('/', (req, res) => {
  const { product, target_audience, usp, pain_points, competitors, market, business_goals, extra_context } = req.body;
  const projectId = req.params.id;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const existing = db.prepare('SELECT id FROM knowledge_base WHERE project_id = ?').get(projectId);

  if (existing) {
    db.prepare(`
      UPDATE knowledge_base SET
        product = ?, target_audience = ?, usp = ?,
        pain_points = ?, competitors = ?, market = ?,
        business_goals = ?, extra_context = ?,
        updated_at = datetime('now')
      WHERE project_id = ?
    `).run(product, target_audience, usp, pain_points, competitors, market, business_goals, extra_context, projectId);
  } else {
    db.prepare(`
      INSERT INTO knowledge_base
        (project_id, product, target_audience, usp, pain_points, competitors, market, business_goals, extra_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, product, target_audience, usp, pain_points, competitors, market, business_goals, extra_context);
  }

  const kb = db.prepare('SELECT * FROM knowledge_base WHERE project_id = ?').get(projectId);
  console.log(`[kb] Saved for project ${projectId}`);
  res.json(kb);
});

export default router;
