import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

const VALID_STATUSES = ['draft', 'review', 'published'];

// GET /api/publications — list all for current user (no content_md)
router.get('/', (req, res) => {
  const publications = db.prepare(`
    SELECT id, title, status, tone, meta_title, meta_description, slug,
           seo_score, project_id, folder_id, brief_id, created_at, updated_at
    FROM publications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(publications);
});

// GET /api/publications/:id — single with full content_md
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM publications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Publication not found' });
  // expose DB column 'content' as 'content_md'
  const { content, ...rest } = row;
  res.json({ ...rest, content_md: content });
});

// POST /api/publications — save publication
router.post('/', (req, res) => {
  const {
    title, content_md, status = 'draft', tone,
    meta_title, meta_description, slug, seo_score,
    project_id, folder_id, brief_id,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });

  const result = db.prepare(`
    INSERT INTO publications
      (user_id, project_id, folder_id, brief_id, title, content, status, tone,
       meta_title, meta_description, slug, seo_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    project_id       || null,
    folder_id        || null,
    brief_id         || null,
    title.trim(),
    content_md       || null,
    status,
    tone             || null,
    meta_title       || null,
    meta_description || null,
    slug             || null,
    seo_score        != null ? Number(seo_score) : null
  );

  const row = db.prepare('SELECT * FROM publications WHERE id = ?').get(result.lastInsertRowid);
  console.log(`[publications] Saved: "${row.title}" id=${row.id} status=${row.status} user=${req.user.id}`);
  const { content, ...rest } = row;
  res.status(201).json({ ...rest, content_md: content });
});

// PUT /api/publications/:id — full update (owner only)
router.put('/:id', (req, res) => {
  const pub = db.prepare('SELECT id FROM publications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!pub) return res.status(404).json({ error: 'Publication not found' });

  const {
    title, content_md, status = 'draft', tone,
    meta_title, meta_description, slug, seo_score,
    project_id, folder_id, brief_id,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });

  db.prepare(`
    UPDATE publications
    SET title = ?, content = ?, status = ?, tone = ?,
        meta_title = ?, meta_description = ?, slug = ?, seo_score = ?,
        project_id = ?, folder_id = ?, brief_id = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title.trim(),
    content_md       || null,
    status,
    tone             || null,
    meta_title       || null,
    meta_description || null,
    slug             || null,
    seo_score        != null ? Number(seo_score) : null,
    project_id       || null,
    folder_id        || null,
    brief_id         || null,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM publications WHERE id = ?').get(req.params.id);
  const { content, ...rest } = row;
  res.json({ ...rest, content_md: content });
});

// PATCH /api/publications/:id/project — update project_id only
router.patch('/:id/project', (req, res) => {
  const pub = db.prepare('SELECT id FROM publications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!pub) return res.status(404).json({ error: 'Publication not found' });
  const project_id = req.body.project_id != null ? Number(req.body.project_id) || null : null;
  db.prepare("UPDATE publications SET project_id = ?, updated_at = datetime('now') WHERE id = ?").run(project_id, req.params.id);
  res.json({ updated: true, project_id });
});

// PATCH /api/publications/:id/status — update status only
router.patch('/:id/status', (req, res) => {
  const pub = db.prepare('SELECT id FROM publications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!pub) return res.status(404).json({ error: 'Publication not found' });

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status — must be draft, review or published' });

  db.prepare("UPDATE publications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);

  const row = db.prepare('SELECT * FROM publications WHERE id = ?').get(req.params.id);
  const { content, ...rest } = row;
  console.log(`[publications] Status → ${status}: id=${req.params.id} user=${req.user.id}`);
  res.json({ ...rest, content_md: content });
});

// DELETE /api/publications/:id — delete (owner only)
router.delete('/:id', (req, res) => {
  const pub = db.prepare('SELECT id FROM publications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!pub) return res.status(404).json({ error: 'Publication not found' });

  db.prepare('DELETE FROM publications WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

export default router;
