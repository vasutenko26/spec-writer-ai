import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const APP_NAME = 'ContentForge';

// ── Login ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  // If user has TOTP enabled — issue a short-lived temp token for 2FA step
  if (user.totp_secret) {
    const tempToken = jwt.sign(
      { userId: user.id, step: '2fa' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.json({ requires2fa: true, tempToken });
  }

  // No 2FA — issue full JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, priority: user.priority, permissions: JSON.parse(user.permissions || '[]') },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password_hash, totp_secret, ...safeUser } = user;
  safeUser.permissions = JSON.parse(user.permissions || '[]');
  res.json({ token, user: safeUser });
});

// ── Verify 2FA ───────────────────────────────────────────────────────────────

router.post('/verify-2fa', (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) return res.status(400).json({ error: 'tempToken and code required' });

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Час дії сесії вичерпано. Увійдіть знову.' });
  }

  if (payload.step !== '2fa') return res.status(401).json({ error: 'Invalid token' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  if (!user || !user.totp_secret) return res.status(401).json({ error: 'User not found or 2FA not configured' });

  const isValid = verifySync({ token: String(code).replace(/\s/g, ''), secret: user.totp_secret }).valid;
  if (!isValid) return res.status(401).json({ error: 'Невірний код. Спробуйте ще раз.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, priority: user.priority, permissions: JSON.parse(user.permissions || '[]') },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password_hash, totp_secret, ...safeUser } = user;
  safeUser.permissions = JSON.parse(user.permissions || '[]');
  res.json({ token, user: safeUser });
});

// ── Logout ───────────────────────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// ── Me ───────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, priority, permissions FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  user.permissions = JSON.parse(user.permissions || '[]');
  res.json(user);
});

// ── Users list for sharing (all authenticated users) ─────────────────────────

router.get('/users-list', requireAuth, (req, res) => {
  const users = db.prepare('SELECT id, username FROM users ORDER BY username').all();
  res.json(users);
});

// ── User management (admin only) ─────────────────────────────────────────────

router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, priority, permissions, totp_secret FROM users ORDER BY id').all();
  res.json(users.map((u) => ({
    ...u,
    permissions: JSON.parse(u.permissions || '[]'),
    totp_enabled: !!u.totp_secret,
    totp_secret: undefined,
  })));
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role = 'user', priority = 5, permissions = [] } = req.body;
  if (!username?.trim() || !password) return res.status(400).json({ error: 'username and password required' });
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'invalid role' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, role, priority, permissions) VALUES (?, ?, ?, ?, ?)'
  ).run(username.trim().toLowerCase(), hash, role, priority, JSON.stringify(permissions));

  res.status(201).json({ id: result.lastInsertRowid, username: username.trim().toLowerCase(), role, priority, permissions, totp_enabled: false });
});

router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { password, role, priority, permissions } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role && role !== 'admin' && user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot demote the last admin' });
  }

  if (password) {
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  }
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  if (priority != null) db.prepare('UPDATE users SET priority = ? WHERE id = ?').run(priority, userId);
  if (permissions) db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), userId);

  const updated = db.prepare('SELECT id, username, role, priority, permissions, totp_secret FROM users WHERE id = ?').get(userId);
  updated.permissions = JSON.parse(updated.permissions || '[]');
  updated.totp_enabled = !!updated.totp_secret;
  delete updated.totp_secret;
  res.json(updated);
});

router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const userId = req.params.id;
  if (String(userId) === String(req.user.id)) return res.status(400).json({ error: 'Cannot delete yourself' });

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ deleted: true });
});

// ── TOTP management (admin) ───────────────────────────────────────────────────

// POST /api/auth/users/:id/totp — generate & activate TOTP secret
router.post('/users/:id/totp', requireAuth, requireAdmin, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateSecret();
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, user.id);

  const otpauthUri = generateURI({ label: user.username, issuer: APP_NAME, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 240, margin: 2 });

  res.json({ secret, qrDataUrl, otpauthUri });
});

// DELETE /api/auth/users/:id/totp — disable TOTP
router.delete('/users/:id/totp', requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET totp_secret = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/auth/admin/totp-codes — current TOTP codes for all users with 2FA
router.get('/admin/totp-codes', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, totp_secret FROM users ORDER BY id').all();
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = 30 - (now % 30);

  const codes = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    totp_enabled: !!u.totp_secret,
    code: u.totp_secret ? generateSync({ secret: u.totp_secret }) : null,
  }));

  res.json({ codes, secondsLeft });
});

export default router;
