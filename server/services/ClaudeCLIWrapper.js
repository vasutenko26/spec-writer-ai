import { spawn } from 'child_process';
import db from '../db/database.js';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const CLI_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS) || 600_000; // 10 минут для кластеризации больших наборов

class ClaudeCLIWrapper {
  // ── Public API ──────────────────────────────────────────────────────────────

  async run(projectId, task, userMessage, extraFramework = '') {
    const context = this._buildContext(projectId, task);
    const fullPrompt = [
      context,
      extraFramework ? `\n${extraFramework}` : '',
      `\n${'─'.repeat(60)}\n`,
      `ЗАДАЧА: ${userMessage}`,
      `\nВідповідай українською мовою. Формат — Markdown з ## заголовками.`,
    ].join('');

    return this._spawnClaude(fullPrompt);
  }

  async runSimple(prompt, jsonMode = false) {
    if (jsonMode) {
      const fullPrompt = `${prompt}\n\nВАЖЛИВО: Відповідь має бути ТІЛЬКИ валідний JSON без будь-якого додаткового тексту, markdown або пояснень.`;
      const rawResponse = await this._spawnClaude(fullPrompt);
      // Extract JSON from markdown code blocks if present
      return this._extractJSON(rawResponse);
    }
    return this._spawnClaude(prompt);
  }

  _extractJSON(text) {
    // Try to extract JSON from markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
    // Return as is if no code block found
    return text.trim();
  }

  // ── Context builder ─────────────────────────────────────────────────────────

  _buildContext(projectId, task) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const kb = db.prepare('SELECT * FROM knowledge_base WHERE project_id = ?').get(projectId);

    const sections = [
      this._section('ПРОЄКТ', [
        `Назва: ${project.name}`,
        `Опис: ${project.description || '—'}`,
        `Ніша: ${project.niche || '—'}`,
      ].join('\n')),
    ];

    if (kb) {
      sections.push(this._section('БАЗА ЗНАНЬ', [
        `Продукт/послуга: ${kb.product || '—'}`,
        `Цільова аудиторія: ${kb.target_audience || '—'}`,
        `УТП (унікальна торгова пропозиція): ${kb.usp || '—'}`,
        `Болі аудиторії: ${kb.pain_points || '—'}`,
        `Конкуренти: ${kb.competitors || '—'}`,
        `Ринок/регіон: ${kb.market || '—'}`,
        `Цілі бізнесу: ${kb.business_goals || '—'}`,
        `Додатковий контекст: ${kb.extra_context || '—'}`,
      ].join('\n')));
    }

    if (['hypotheses', 'content_plan', 'anomaly', 'competitors'].includes(task)) {
      const hypotheses = db.prepare(`
        SELECT * FROM hypotheses
        WHERE project_id = ?
        ORDER BY created_at DESC LIMIT 20
      `).all(projectId);

      if (hypotheses.length) {
        const formatted = hypotheses.map((h) => {
          const lines = [`[${h.status.toUpperCase()}] ${h.title}`];
          if (h.description) lines.push(`  Ідея: ${h.description}`);
          if (h.rejection_reason) lines.push(`  Причина відмови: ${h.rejection_reason}`);
          if (h.implementation_result) lines.push(`  Результат: ${h.implementation_result}`);
          if (h.ai_conclusion) lines.push(`  Висновок AI: ${h.ai_conclusion.slice(0, 200)}...`);
          return lines.join('\n');
        }).join('\n\n');
        sections.push(this._section('ІСТОРІЯ ГІПОТЕЗ', formatted));
      }
    }

    if (['hypotheses', 'content_plan'].includes(task)) {
      const anomalies = db.prepare(`
        SELECT * FROM anomaly_analyses
        WHERE project_id = ?
        ORDER BY created_at DESC LIMIT 10
      `).all(projectId);

      if (anomalies.length) {
        const formatted = anomalies.map((a) =>
          `"${a.hypothesis_title}" → ${a.outcome}: ${(a.ai_conclusion || '').slice(0, 150)}`
        ).join('\n');
        sections.push(this._section('ВИСНОВКИ З АНОМАЛІЙ', formatted));
      }
    }

    if (task === 'competitors') {
      const reports = db.prepare(`
        SELECT query, created_at FROM competitor_reports
        WHERE project_id = ?
        ORDER BY created_at DESC LIMIT 5
      `).all(projectId);

      if (reports.length) {
        const formatted = reports.map((r) => `• ${r.query} (${r.created_at.slice(0, 10)})`).join('\n');
        sections.push(this._section('ПОПЕРЕДНІ АНАЛІЗИ КОНКУРЕНТІВ', formatted));
      }
    }

    return `Ти — AI-маркетолог проєкту. Використовуй весь контекст нижче для прийняття рішень.\n\n${sections.join('\n\n')}`;
  }

  _section(title, body) {
    return `${'═'.repeat(50)}\n${title}\n${'═'.repeat(50)}\n${body}`;
  }

  // ── claude CLI spawn ────────────────────────────────────────────────────────

  _spawnClaude(prompt) {
    return new Promise((resolve, reject) => {
      const child = spawn(CLAUDE_BIN, ['--print'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          HOME: process.env.HOME || '/root',
          PATH: process.env.PATH,
          LANG: process.env.LANG || 'en_US.UTF-8',
          TERM: 'xterm',
          CLAUDE_BIN: process.env.CLAUDE_BIN,
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Claude CLI timed out after ${CLI_TIMEOUT_MS / 1000}s`));
      }, CLI_TIMEOUT_MS);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const errDetail = stderr.slice(0, 400) || 'no stderr';
          return reject(new Error(`claude exited with code ${code}: ${errDetail}`));
        }
        const result = stdout.trim();
        if (!result) {
          return reject(new Error('claude returned empty output'));
        }
        resolve(result);
      });

      child.on('error', (e) => {
        clearTimeout(timer);
        if (e.code === 'ENOENT') {
          reject(new Error(`claude CLI not found. Ensure 'claude' is installed and in PATH.`));
        } else {
          reject(new Error(`Failed to start claude CLI: ${e.message}`));
        }
      });

      child.stdin.write(prompt, 'utf8');
      child.stdin.end();
    });
  }
}

export default new ClaudeCLIWrapper();
