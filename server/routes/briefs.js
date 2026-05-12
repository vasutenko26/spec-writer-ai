import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/briefs — list all briefs for current user (no content_json)
router.get('/', (req, res) => {
  const briefs = db.prepare(`
    SELECT id, title, keyword, language, region, project_id, folder_id, notes, created_at, updated_at
    FROM briefs
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(briefs);
});

// GET /api/briefs/:id — single brief with full content_json
router.get('/:id', (req, res) => {
  const brief = db.prepare('SELECT * FROM briefs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!brief) return res.status(404).json({ error: 'Brief not found' });
  res.json(brief);
});

// POST /api/briefs — save brief
router.post('/', (req, res) => {
  const { title, keyword, language, region, content_json, notes, project_id, folder_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });

  const result = db.prepare(`
    INSERT INTO briefs (user_id, project_id, folder_id, title, keyword, language, region, content_json, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    project_id || null,
    folder_id  || null,
    title.trim(),
    keyword    || null,
    language   || null,
    region     || null,
    content_json ? JSON.stringify(content_json) : null,
    notes      || null
  );

  const brief = db.prepare('SELECT * FROM briefs WHERE id = ?').get(result.lastInsertRowid);
  console.log(`[briefs] Saved: "${brief.title}" id=${brief.id} user=${req.user.id}`);
  res.status(201).json(brief);
});

// PUT /api/briefs/:id — update (owner only)
router.put('/:id', (req, res) => {
  const brief = db.prepare('SELECT id FROM briefs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!brief) return res.status(404).json({ error: 'Brief not found' });

  const { title, keyword, language, region, content_json, notes, project_id, folder_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });

  db.prepare(`
    UPDATE briefs
    SET title = ?, keyword = ?, language = ?, region = ?, content_json = ?, notes = ?,
        project_id = ?, folder_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title.trim(),
    keyword    || null,
    language   || null,
    region     || null,
    content_json ? JSON.stringify(content_json) : null,
    notes      || null,
    project_id || null,
    folder_id  || null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// PATCH /api/briefs/:id/project — update project_id only
router.patch('/:id/project', (req, res) => {
  const brief = db.prepare('SELECT id FROM briefs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!brief) return res.status(404).json({ error: 'Brief not found' });
  const project_id = req.body.project_id != null ? Number(req.body.project_id) || null : null;
  db.prepare("UPDATE briefs SET project_id = ?, updated_at = datetime('now') WHERE id = ?").run(project_id, req.params.id);
  res.json({ updated: true, project_id });
});

// DELETE /api/briefs/:id — delete (owner only)
router.delete('/:id', (req, res) => {
  const brief = db.prepare('SELECT id FROM briefs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!brief) return res.status(404).json({ error: 'Brief not found' });

  db.prepare('DELETE FROM briefs WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

export default router;
