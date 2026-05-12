import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/projects — list all
router.get('/', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM hypotheses WHERE project_id = p.id) AS hypothesis_count,
      (SELECT COUNT(*) FROM content_plans WHERE project_id = p.id) AS plan_count,
      (SELECT COUNT(*) FROM competitor_reports WHERE project_id = p.id) AS report_count,
      CASE WHEN kb.id IS NOT NULL THEN 1 ELSE 0 END AS has_kb
    FROM projects p
    LEFT JOIN knowledge_base kb ON kb.project_id = p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects);
});

// POST /api/projects — create
router.post('/', (req, res) => {
  const { name, description, niche } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const result = db.prepare(
    'INSERT INTO projects (name, description, niche) VALUES (?, ?, ?)'
  ).run(name.trim(), description || '', niche || '');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  console.log(`[projects] Created: "${project.name}" id=${project.id}`);
  res.status(201).json(project);
});

// GET /api/projects/:id — single project with stats
router.get('/:id', (req, res) => {
  const project = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM hypotheses WHERE project_id = p.id) AS hypothesis_count,
      (SELECT COUNT(*) FROM hypotheses WHERE project_id = p.id AND status = 'accepted') AS accepted_count,
      (SELECT COUNT(*) FROM hypotheses WHERE project_id = p.id AND status = 'rejected') AS rejected_count,
      (SELECT COUNT(*) FROM content_plans WHERE project_id = p.id) AS plan_count,
      (SELECT COUNT(*) FROM competitor_reports WHERE project_id = p.id) AS report_count,
      CASE WHEN kb.id IS NOT NULL THEN 1 ELSE 0 END AS has_kb
    FROM projects p
    LEFT JOIN knowledge_base kb ON kb.project_id = p.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// PUT /api/projects/:id — update
router.put('/:id', (req, res) => {
  const { name, description, niche } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  db.prepare(
    'UPDATE projects SET name = ?, description = ?, niche = ? WHERE id = ?'
  ).run(name.trim(), description || '', niche || '', req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

export default router;
