import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// POST /api/shares — create share
router.post('/', (req, res) => {
  const { shared_user_id, item_type, item_id, permission = 'view' } = req.body;
  const owner_user_id = req.user.id;

  if (!shared_user_id || !item_type || !item_id)
    return res.status(400).json({ error: 'shared_user_id, item_type, item_id required' });
  if (Number(shared_user_id) === owner_user_id)
    return res.status(400).json({ error: 'Cannot share with yourself' });

  const existing = db.prepare(
    'SELECT id FROM content_shares WHERE owner_user_id=? AND shared_user_id=? AND item_type=? AND item_id=?'
  ).get(owner_user_id, shared_user_id, item_type, item_id);

  if (existing) {
    db.prepare('UPDATE content_shares SET permission=? WHERE id=?').run(permission, existing.id);
    return res.json({ updated: true });
  }

  const result = db.prepare(
    'INSERT INTO content_shares (owner_user_id, shared_user_id, item_type, item_id, permission) VALUES (?,?,?,?,?)'
  ).run(owner_user_id, shared_user_id, item_type, item_id, permission);

  console.log(`[shares] Created: item=${item_type}#${item_id} → user=${shared_user_id} perm=${permission}`);
  res.json({ id: result.lastInsertRowid, created: true });
});

// GET /api/shares — list shares created by current user
router.get('/', (req, res) => {
  const shares = db.prepare(`
    SELECT cs.*, u.username as shared_with
    FROM content_shares cs
    JOIN users u ON u.id = cs.shared_user_id
    WHERE cs.owner_user_id = ?
    ORDER BY cs.created_at DESC
  `).all(req.user.id);
  res.json(shares);
});

// DELETE /api/shares/:id — revoke share
router.delete('/:id', (req, res) => {
  const share = db.prepare('SELECT * FROM content_shares WHERE id=?').get(req.params.id);
  if (!share || share.owner_user_id !== req.user.id)
    return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM content_shares WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

export default router;
