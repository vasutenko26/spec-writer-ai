import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../data/contentforge.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    priority      INTEGER NOT NULL DEFAULT 5,
    permissions   TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    niche       TEXT,
    user_id     INTEGER REFERENCES users(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    product          TEXT,
    target_audience  TEXT,
    usp              TEXT,
    pain_points      TEXT,
    competitors      TEXT,
    market           TEXT,
    business_goals   TEXT,
    extra_context    TEXT,
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hypotheses (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id            INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    description           TEXT,
    framework_used        TEXT,
    status                TEXT DEFAULT 'pending'
                          CHECK(status IN ('pending','accepted','rejected')),
    rejection_reason      TEXT,
    implementation_result TEXT,
    ai_conclusion         TEXT,
    created_at            TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS anomaly_analyses (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    hypothesis_id     INTEGER REFERENCES hypotheses(id),
    hypothesis_title  TEXT,
    outcome           TEXT CHECK(outcome IN ('success','failure','partial')),
    description       TEXT,
    ai_conclusion     TEXT,
    created_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_plans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT,
    period     TEXT,
    plan_json  TEXT,
    raw_text   TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS competitor_reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    query      TEXT,
    raw_data   TEXT,
    ai_report  TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    parent_id  INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS briefs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    folder_id    INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    keyword      TEXT,
    language     TEXT,
    region       TEXT,
    content_json TEXT,
    notes        TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS publications (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id       INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    brief_id         INTEGER REFERENCES briefs(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    content          TEXT,
    status           TEXT DEFAULT 'draft' CHECK(status IN ('draft','review','published')),
    tone             TEXT,
    meta_title       TEXT,
    meta_description TEXT,
    slug             TEXT,
    seo_score        INTEGER,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_shares (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type      TEXT NOT NULL CHECK(item_type IN ('brief','publication','folder')),
    item_id        INTEGER NOT NULL,
    permission     TEXT DEFAULT 'view' CHECK(permission IN ('view','edit')),
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gsc_tokens (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token  TEXT,
    refresh_token TEXT,
    expiry_date   INTEGER,
    site_url      TEXT,
    updated_at    TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default admin if users table is empty
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const ALL_TOOLS = ['serp', 'brief', 'content', 'seo', 'lsi', 'pagespeed', 'cluster', 'linking', 'campaign'];
  const hash = bcrypt.hashSync('admin', 12);
  db.prepare('INSERT INTO users (username, password_hash, role, priority, permissions) VALUES (?, ?, ?, ?, ?)').run(
    'admin', hash, 'admin', 1, JSON.stringify(ALL_TOOLS)
  );
  console.log('[db] Default admin user created (username: admin, password: admin) — change it immediately!');
}

export default db;
