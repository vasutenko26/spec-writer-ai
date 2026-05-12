import { Router } from 'express';
import { google } from 'googleapis';
import db from '../db/database.js';

const router = Router();

const FRONTEND_URL = 'https://aiagentlab.fun';

function oauth2Client() {
  return new google.auth.OAuth2(
    process.env.GSC_CLIENT_ID,
    process.env.GSC_CLIENT_SECRET,
    process.env.GSC_REDIRECT_URI
  );
}

function authedClient(row) {
  const client = oauth2Client();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
  });
  client.on('tokens', (tokens) => {
    db.prepare(
      `UPDATE gsc_tokens SET access_token = ?, expiry_date = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).run(tokens.access_token, tokens.expiry_date ?? null, row.user_id);
  });
  return client;
}

// GET /api/gsc/auth-url  — generate OAuth consent URL
router.get('/auth-url', (req, res) => {
  const url = oauth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
    state: String(req.user.id),
  });
  res.json({ url });
});

// GET /api/gsc/status  — check connection state
router.get('/status', (req, res) => {
  const row = db.prepare('SELECT site_url, updated_at FROM gsc_tokens WHERE user_id = ?').get(req.user.id);
  res.json({ connected: !!row, site_url: row?.site_url ?? null });
});

// GET /api/gsc/sites  — list GSC properties
router.get('/sites', async (req, res) => {
  const row = db.prepare('SELECT * FROM gsc_tokens WHERE user_id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Not connected' });
  try {
    const client = authedClient(row);
    const wm = google.webmasters({ version: 'v3', auth: client });
    const { data } = await wm.sites.list();
    res.json(data.siteEntry || []);
  } catch (e) {
    console.error('[GSC /sites]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/gsc/site  — save chosen site
router.post('/site', (req, res) => {
  const { site_url } = req.body;
  if (!site_url) return res.status(400).json({ error: 'site_url required' });
  const r = db.prepare(
    `UPDATE gsc_tokens SET site_url = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).run(site_url, req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Not connected' });
  res.json({ ok: true });
});

// GET /api/gsc/analytics?days=30  — per-page clicks/impressions/ctr/position
router.get('/analytics', async (req, res) => {
  const row = db.prepare('SELECT * FROM gsc_tokens WHERE user_id = ?').get(req.user.id);
  if (!row?.site_url) return res.status(404).json({ error: 'Not connected or no site selected' });

  const days = Math.min(Number(req.query.days) || 30, 90);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);

  try {
    const client = authedClient(row);
    const sc = google.searchconsole({ version: 'v1', auth: client });
    const { data } = await sc.searchanalytics.query({
      siteUrl: row.site_url,
      requestBody: {
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ['page'],
        rowLimit: 1000,
      },
    });
    const rows = (data.rows || []).map((r) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));
    res.json({ site_url: row.site_url, rows });
  } catch (e) {
    console.error('[GSC /analytics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/gsc/disconnect
router.delete('/disconnect', (req, res) => {
  db.prepare('DELETE FROM gsc_tokens WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// GET /api/gsc/verification-token — return instructions for verifying a site
router.get('/verification-token', (req, res) => {
  const row = db.prepare('SELECT user_id FROM gsc_tokens WHERE user_id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Not connected' });
  res.json({
    instructions: [
      'Зайдіть на search.google.com/search-console',
      'Натисніть "Додати ресурс"',
      'Оберіть "URL-префікс" і введіть URL вашого сайту',
      'Оберіть спосіб верифікації "HTML-тег"',
      'Скопіюйте мета-тег і додайте в <head> вашого сайту',
      'Поверніться і натисніть "Підтвердити"',
    ],
  });
});

// POST /api/gsc/add-site — add site to GSC via API and save as selected
router.post('/add-site', async (req, res) => {
  const { site_url } = req.body;
  if (!site_url) return res.status(400).json({ error: 'site_url required' });
  const row = db.prepare('SELECT * FROM gsc_tokens WHERE user_id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Not connected' });
  try {
    const client = authedClient(row);
    const wm = google.webmasters({ version: 'v3', auth: client });
    await wm.sites.add({ siteUrl: site_url });
    db.prepare(`UPDATE gsc_tokens SET site_url = ?, updated_at = datetime('now') WHERE user_id = ?`)
      .run(site_url, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[GSC /add-site]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/gsc/callback  — OAuth redirect from Google (no JWT, user_id via state)
export async function gscCallbackHandler(req, res) {
  const { code, state, error } = req.query;
  if (error || !code || !state) {
    return res.redirect(`${FRONTEND_URL}/integrations?gsc=error`);
  }
  const userId = Number(state);
  if (!userId) return res.redirect(`${FRONTEND_URL}/integrations?gsc=error`);

  try {
    const client = oauth2Client();
    const { tokens } = await client.getToken(String(code));
    db.prepare(`
      INSERT INTO gsc_tokens (user_id, access_token, refresh_token, expiry_date, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        access_token  = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        expiry_date   = excluded.expiry_date,
        updated_at    = datetime('now')
    `).run(userId, tokens.access_token ?? null, tokens.refresh_token ?? null, tokens.expiry_date ?? null);
    res.redirect(`${FRONTEND_URL}/integrations?gsc=connected`);
  } catch (e) {
    console.error('[GSC callback]', e.message);
    res.redirect(`${FRONTEND_URL}/integrations?gsc=error`);
  }
}

export default router;
