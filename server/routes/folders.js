import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/folders — list all folders for current user with item counts
router.get('/', (req, res) => {
  const folders = db.prepare(`
    SELECT f.*,
      (SELECT COUNT(*) FROM briefs       WHERE folder_id = f.id) AS brief_count,
      (SELECT COUNT(*) FROM publications WHERE folder_id = f.id) AS publication_count
    FROM folders f
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(folders);
});

// POST /api/folders — create folder
router.post('/', (req, res) => {
  const { name, project_id, parent_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const result = db.prepare(
    'INSERT INTO folders (user_id, project_id, parent_id, name) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, project_id || null, parent_id || null, name.trim());

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
  console.log(`[folders] Created: "${folder.name}" id=${folder.id} user=${req.user.id}`);
  res.status(201).json(folder);
});

// PUT /api/folders/:id — rename (owner only)
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), req.params.id);

  res.json({ ...folder, name: name.trim() });
});

// DELETE /api/folders/:id — delete (owner only)
router.delete('/:id', (req, res) => {
  const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

export default router;
