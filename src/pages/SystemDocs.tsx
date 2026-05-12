import { useState, useEffect, useRef } from "react";
import { FileText, Server, Layers, Wrench, Zap, Globe, Shield, Rocket, Terminal, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";

// ── Copy button for code blocks ───────────────────────────────────────────────
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// ── Code block ────────────────────────────────────────────────────────────────
const Code = ({ children, lang = "" }: { children: string; lang?: string }) => (
  <div className="relative group my-4">
    {lang && <div className="absolute top-2.5 left-3 text-[10px] font-mono text-white/30 uppercase tracking-widest">{lang}</div>}
    <pre className={`bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-mono text-zinc-200 overflow-x-auto ${lang ? "pt-8 pb-4" : "py-4"} px-4 leading-relaxed`}>
      <code>{children.trim()}</code>
    </pre>
    <CopyButton text={children.trim()} />
  </div>
);

// ── Table ─────────────────────────────────────────────────────────────────────
const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 my-4">
    <table className="w-full text-sm border-collapse">
      <thead className="bg-zinc-50 dark:bg-zinc-900">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap text-xs uppercase tracking-wide">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/60 even:bg-zinc-50/50 dark:even:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 align-top">
                <span dangerouslySetInnerHTML={{ __html: cell }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ children, color = "blue" }: { children: string; color?: "blue" | "green" | "purple" | "orange" | "red" }) => {
  const cls = {
    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    green:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    red:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  }[color];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>{children}</span>;
};

// ── Section heading ───────────────────────────────────────────────────────────
const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-16 mb-6 pb-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 scroll-mt-20">
    {children}
  </h2>
);
const H3 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h3 id={id} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-10 mb-3 scroll-mt-20">
    {children}
  </h3>
);

// ── Callout ───────────────────────────────────────────────────────────────────
const Callout = ({ type = "info", children }: { type?: "info" | "warn" | "tip"; children: React.ReactNode }) => {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300",
    warn: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300",
    tip:  "border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-300",
  }[type];
  const label = { info: "Інфо", warn: "Увага", tip: "Порада" }[type];
  return (
    <div className={`rounded-xl border px-4 py-3 my-4 text-sm ${styles}`}>
      <span className="font-semibold mr-2">{label}.</span>{children}
    </div>
  );
};

// ── Flow diagram ──────────────────────────────────────────────────────────────
const FlowStep = ({ n, label, sub, color = "blue" }: { n: number; label: string; sub: string; color?: string }) => {
  const cls: Record<string, string> = {
    blue:   "bg-blue-500",
    green:  "bg-emerald-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink:   "bg-pink-500",
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 w-7 h-7 rounded-full ${cls[color] || cls.blue} text-white text-xs font-bold flex items-center justify-center mt-0.5`}>{n}</div>
      <div>
        <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      </div>
    </div>
  );
};

// ── TOC items ─────────────────────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: "architecture",    label: "Архітектура",       icon: Layers },
  { id: "stack",           label: "Технологічний стек", icon: Wrench },
  { id: "structure",       label: "Структура проєкту",  icon: FileText },
  { id: "tools",           label: "Інструменти",        icon: Zap },
  { id: "api",             label: "API-ендпоінти",      icon: Server },
  { id: "fallback",        label: "Smart Fallback",     icon: Rocket },
  { id: "integrations",    label: "Інтеграції",         icon: Globe },
  { id: "auth",            label: "Auth та ролі",       icon: Shield },
  { id: "security-audit",  label: "Аудит безпеки",      icon: Shield },
  { id: "deploy",          label: "Деплой",             icon: Terminal },
  { id: "env",             label: "Змінні оточення",    icon: Terminal },
  { id: "local",           label: "Локальна розробка",  icon: Terminal },
];

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function SystemDocs() {
  const [activeId, setActiveId] = useState("architecture");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sections = TOC_ITEMS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      let current = sections[0]?.id ?? "architecture";
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= 96) current = el.id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">ContentForge</span>
            <span className="text-zinc-400 mx-1">/</span>
            <span className="text-sm text-zinc-500">Документація</span>
          </div>
          <a
            href="https://aiagentlab.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Відкрити платформу <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-violet-50 via-indigo-50/40 to-white dark:from-violet-950/30 dark:via-indigo-950/20 dark:to-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-4">
            <Badge color="purple">v1.1</Badge>
            <Badge color="green">Живий сайт</Badge>
            <Badge color="blue">Security Hardened</Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight mb-4">
            ContentForge<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              Технічна документація
            </span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8">
            Повний опис архітектури, інструментів, API та інфраструктури SEO-платформи
            для автоматизованого створення контенту на базі Google Gemini AI.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: "🤖", label: "Google Gemini AI" },
              { icon: "🔍", label: "SearXNG SERP" },
              { icon: "⚡", label: "Smart Fallback" },
              { icon: "🗄️", label: "Supabase Auth" },
              { icon: "🌐", label: "WordPress API" },
            ].map(({ icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm">
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layout: sidebar + content ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 flex gap-12 py-10">

        {/* Sticky TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3 px-2">Зміст</p>
            <nav className="space-y-0.5">
              {TOC_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
                    activeId === id
                      ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main ref={contentRef} className="flex-1 min-w-0 max-w-3xl">

          {/* ── 1. Архітектура ─────────────────────────────────────────────── */}
          <H2 id="architecture"><Layers className="h-6 w-6 text-violet-500" />Архітектура системи</H2>
          <p className="mb-6">Платформа побудована на класичній триланковій архітектурі: статичний SPA на фронтенді, Express API-сервер на бекенді та зовнішні сервіси (Gemini, SearXNG, Supabase).</p>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 my-6 font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed overflow-x-auto">
            <pre>{`                ┌─────────────────────────────┐
                │   Браузер користувача        │
                │   React + Vite SPA           │
                └────────────┬────────────────┘
                             │ HTTPS
                ┌────────────▼────────────────┐
                │   Caddy (reverse proxy)      │
                │   aiagentlab.fun · TLS       │
                │                              │
                │  /api/*  ──▶  :3001          │
                │  /*      ──▶  /var/www/dist  │
                └──────┬───────────────────────┘
                       │
       ┌───────────────▼───────────────┐
       │   Node.js + Express API        │
       │   /root/spec-writer-ai/server  │
       │   Порт 3001 (localhost only)   │
       └───┬───────────────┬────────────┘
           │               │
┌──────────▼──┐   ┌────────▼──────────────┐
│  Google     │   │  SearXNG (Docker)      │
│  Gemini API │   │  Порт 8888             │
│  (зовнішній)│   │  Google + Bing SERP    │
└─────────────┘   └────────────────────────┘
           │
┌──────────▼────────────┐
│  Supabase              │
│  Auth + PostgreSQL     │
└────────────────────────┘`}</pre>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 my-6">
            {[
              { title: "Фронтенд", body: "Статичний SPA, зібраний Vite. Роздається Caddy з /var/www/spec-writer-ai. Не потребує Node.js на продакшені." },
              { title: "API-сервер", body: "Node.js (ESM) на порту 3001. Слухає тільки localhost — зовні недоступний. Caddy проксує /api/*." },
              { title: "SearXNG", body: "Локальний пошуковий агрегатор у Docker. Замінює платні SERP API (DataForSEO тощо). Агрегує Google + Bing." },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {/* ── 2. Стек ─────────────────────────────────────────────────────── */}
          <H2 id="stack"><Wrench className="h-6 w-6 text-violet-500" />Технологічний стек</H2>

          <H3 id="stack-frontend">Фронтенд</H3>
          <Table
            headers={["Технологія", "Призначення"]}
            rows={[
              ["<b>React 18.3</b>", "UI-фреймворк"],
              ["<b>TypeScript 5</b>", "Типізація"],
              ["<b>Vite 5.4</b>", "Збірка та dev-сервер (HMR)"],
              ["<b>TailwindCSS 3</b>", "Утилітарні стилі"],
              ["<b>shadcn/ui</b> (Radix UI)", "Готові UI-компоненти"],
              ["<b>React Router v6</b>", "Клієнтська навігація (SPA)"],
              ["<b>TanStack Query v5</b>", "Серверний стан та кешування"],
              ["<b>Sonner</b>", "Toast-сповіщення"],
              ["<b>ReactMarkdown + remark-gfm</b>", "Рендер Markdown у браузері"],
              ["<b>XLSX + FileSaver</b>", "Експорт у Excel (.xlsx)"],
              ["<b>docx</b>", "Генерація Word-документів (.docx)"],
            ]}
          />

          <H3 id="stack-backend">Бекенд</H3>
          <Table
            headers={["Технологія", "Призначення"]}
            rows={[
              ["<b>Node.js (ESM)</b>", "JavaScript runtime"],
              ["<b>Express 4</b>", "HTTP-сервер та роутинг"],
              ["<b>jsonwebtoken</b>", "JWT підпис та перевірка (HS256)"],
              ["<b>bcryptjs</b>", "Хешування паролів (cost 12)"],
              ["<b>express-rate-limit</b>", "Rate limiting для всіх API-маршрутів"],
              ["<b>better-sqlite3</b>", "SQLite: users + projects + content"],
              ["<b>node-html-parser</b>", "Парсинг HTML конкурентів (скрапінг)"],
              ["<b>marked</b>", "Конвертація Markdown → HTML"],
              ["<b>dotenv</b>", "Зчитування змінних оточення"],
            ]}
          />

          <H3 id="stack-infra">Інфраструктура</H3>
          <Table
            headers={["Компонент", "Роль"]}
            rows={[
              ["<b>Debian VPS</b>", "Хостинг (78.27.202.85)"],
              ["<b>Caddy</b>", "Reverse proxy + автоматичний TLS (Let's Encrypt)"],
              ["<b>systemd</b>", "Управління Node.js сервісом (contentforge-api)"],
              ["<b>Docker</b>", "Ізольований контейнер SearXNG"],
              ["<b>Supabase</b>", "Auth + PostgreSQL база даних (SaaS)"],
              ["<b>Google Gemini API</b>", "AI-генерація тексту"],
              ["<b>Google PageSpeed API</b>", "Технічний аудит продуктивності"],
            ]}
          />

          {/* ── 3. Структура ───────────────────────────────────────────────── */}
          <H2 id="structure"><FileText className="h-6 w-6 text-violet-500" />Структура проєкту</H2>

          <Code lang="bash">{`
spec-writer-ai/
│
├── src/                            # Фронтенд (React + TypeScript)
│   ├── pages/                      # Сторінки (1 файл = 1 маршрут)
│   │   ├── LandingPage.tsx         # Лендінг для незалогінених
│   │   ├── LoginPage.tsx           # Сторінка входу
│   │   ├── Dashboard.tsx           # Головна панель після входу
│   │   ├── SerpAnalysis.tsx        # Аналіз пошукової видачі
│   │   ├── BriefTool.tsx           # Генерація ТЗ
│   │   ├── ContentTool.tsx         # AI-генерація контенту
│   │   ├── CampaignTool.tsx        # Автоматична кампанія
│   │   ├── LsiTool.tsx             # LSI-аналіз
│   │   ├── PageSpeedTool.tsx       # Аудит PageSpeed
│   │   ├── SemanticClusterTool.tsx # Семантична кластеризація
│   │   ├── SeoChecker.tsx          # SEO-перевірка тексту
│   │   ├── SmartLinkingTool.tsx    # Розумна перелінковка
│   │   ├── HistoryPage.tsx         # Журнал дій
│   │   ├── IntegrationsPage.tsx    # Налаштування WordPress
│   │   └── UsersAdmin.tsx          # Адмін: управління юзерами
│   │
│   ├── components/
│   │   ├── AppLayout.tsx           # Header + wrapper для всіх сторінок
│   │   ├── BriefForm.tsx           # Форма генерації ТЗ
│   │   ├── ContentForm.tsx         # Форма генерації контенту
│   │   ├── WordPressModal.tsx      # Модал публікації в WordPress
│   │   ├── ProtectedRoute.tsx      # HOC захисту маршруту (Supabase)
│   │   └── tools/
│   │       ├── Campaign.tsx        # Логіка 5-крокової автокампанії
│   │       ├── ContentQuality.tsx  # Аналіз якості тексту (inline)
│   │       ├── LsiAnalyzer.tsx     # UI LSI-аналізу
│   │       ├── OutlineBuilder.tsx  # Конструктор структури заголовків
│   │       ├── PageSpeedAudit.tsx  # UI аудиту PageSpeed
│   │       ├── SemanticCluster.tsx # UI кластеризації
│   │       └── SmartLinking.tsx    # UI перелінковки
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Стан авторизації (Supabase session)
│   │   ├── AppStateContext.tsx     # Спільний стан між інструментами
│   │   └── HistoryContext.tsx      # Журнал дій у localStorage
│   │
│   └── lib/
│       ├── geminiFallback.ts       # Smart Model Fallback логіка
│       ├── exportDocx.ts           # Markdown → Word (.docx)
│       └── wordpress.ts            # WordPress REST API клієнт
│
├── server/
│   ├── index.js                    # Весь бекенд: Express + всі 15 роутів
│   ├── package.json                # Серверні залежності
│   └── .env                        # API-ключі (не в git!)
│
├── dist/                           # Зібраний фронтенд → деплоїться в /var/www
├── docker-compose.searxng.yml      # Docker-конфіг для SearXNG
└── searxng/                        # Конфігурація SearXNG
          `}</Code>

          {/* ── 4. Інструменти ─────────────────────────────────────────────── */}
          <H2 id="tools"><Zap className="h-6 w-6 text-violet-500" />Інструменти платформи</H2>

          {/* Campaign flow */}
          <H3 id="tool-campaign">Автоматична SEO-кампанія</H3>
          <p className="text-sm mb-4">Флагманський інструмент. Повністю автоматизований пайплайн з 5 кроків за одним натисканням кнопки.</p>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 my-4 space-y-3">
            {[
              { n: 1, label: "SERP Analysis", sub: "SearXNG → Google+Bing → ТОП-10 URL → паралельний скрапінг HTML", color: "blue" },
              { n: 2, label: "PageSpeed Audit", sub: "Google PageSpeed API → перший конкурент або вказаний URL → scores 0–100", color: "green" },
              { n: 3, label: "LSI-аналіз", sub: "Токенізація текстів ТОП-10 → частотний аналіз → семантичні слова", color: "purple" },
              { n: 4, label: "Генерація ТЗ", sub: "Gemini AI + дані SERP → детальне технічне завдання (Markdown)", color: "orange" },
              { n: 5, label: "Генерація статті", sub: "Gemini AI + тема + топ-10 LSI-слів → SEO-оптимізована стаття", color: "pink" },
            ].map((s) => (
              <div key={s.n} className="flex gap-3 items-start">
                <FlowStep {...s} />
                {s.n < 5 && <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-1 ml-1 shrink-0 hidden sm:block" />}
              </div>
            ))}
          </div>

          <Callout type="tip">
            Опційний режим <b>ручної структури</b>: кампанія зупиняється перед кроком 4, показує OutlineBuilder із заголовками конкурентів. Ви підтверджуєте → ТЗ будується за вашою структурою.
          </Callout>

          <H3 id="tool-serp">Аналіз видачі (SERP Analysis)</H3>
          <p className="text-sm mb-2">Аналізує ТОП-10 Google для ключового слова. Збирає заголовки H1–H6, підраховує слова, зображення, списки для кожного конкурента. Gemini надає AI-аналіз: пошуковий намір, типи контенту, рекомендації. Результати кешуються в AppStateContext і передаються в генерацію ТЗ.</p>

          <H3 id="tool-brief">Генерація ТЗ</H3>
          <p className="text-sm mb-2">Структуроване технічне завдання для копірайтера. Якщо є дані з SERP Analysis — перевикористовує їх, не роблячи новий запит. Підтримує кастомну структуру заголовків через OutlineBuilder. Розділи ТЗ: мета, таблиця конкурентів, параметри, LSI-слова, H1–H3 структура, FAQ, мета-теги, slug.</p>

          <H3 id="tool-content">AI-генерація контенту</H3>
          <p className="text-sm mb-2">Приймає тему, ключові слова, тон і обсяг. Системний промпт включає анти-AI правила: Burstiness (чергування довжини речень), Perplexity (непередбачуваність фраз), список заборонених кліше. Має вибір моделі Gemini та Smart Fallback.</p>

          <H3 id="tool-lsi">LSI-аналіз</H3>
          <p className="text-sm mb-2">Збирає семантично пов'язані слова з ТОП-10. Підраховує <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">docFreq</code> (к-сть сторінок) та <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">totalFreq</code> (загальна частота). Розраховує рекомендовану кількість вживань. Фільтрує стоп-слова та похідні від головного КС.</p>

          <H3 id="tool-other">Інші інструменти</H3>
          <Table
            headers={["Інструмент", "Що робить"]}
            rows={[
              ["<b>PageSpeed Аудит</b>", "Google PageSpeed API → Performance, Accessibility, Best Practices, SEO (0–100)"],
              ["<b>Семантична кластеризація</b>", "Групує КС за спільними URL у видачі. Streaming-відповідь з прогресом. До 100 КС."],
              ["<b>SEO-перевірка тексту</b>", "Підраховує H1/H2/H3, щільність КС, довжину речень → AI-рекомендації від Gemini"],
              ["<b>Smart Linking</b>", "Gemini знаходить природні місця в тексті для внутрішніх посилань з анкорами"],
              ["<b>AI-детектор</b>", "Burstiness + Perplexity score, частота кліше → % ймовірності AI-тексту"],
              ["<b>OutlineBuilder</b>", "Drag-drop вибір заголовків конкурентів + власні H2/H3 → передає структуру в ТЗ"],
              ["<b>Журнал дій</b>", "Зберігає останні результати в localStorage, швидкий перегляд та копіювання"],
            ]}
          />

          {/* ── 5. API ──────────────────────────────────────────────────────── */}
          <H2 id="api"><Server className="h-6 w-6 text-violet-500" />API-ендпоінти</H2>
          <p className="mb-4 text-sm">Базовий URL: <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">https://aiagentlab.fun</code>. Всі ендпоінти — <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">POST /api/...</code> якщо не вказано інше.</p>

          <Callout type="info">
            Всі ендпоінти крім <code>/api/health</code> та <code>/api/auth/login|logout</code> вимагають заголовку <code>Authorization: Bearer &lt;jwt&gt;</code>
          </Callout>

          <Table
            headers={["Ендпоінт", "Метод", "Ключові параметри", "Опис"]}
            rows={[
              ["<code class='text-xs'>/api/health</code>", "GET", "—", "Перевірка стану (публічний)"],
              ["<code class='text-xs'>/api/auth/login</code>", "POST", "username, password", "Авторизація → JWT (публічний)"],
              ["<code class='text-xs'>/api/auth/logout</code>", "POST", "—", "Logout (публічний)"],
              ["<code class='text-xs'>/api/auth/me</code>", "GET", "—", "Поточний користувач"],
              ["<code class='text-xs'>/api/auth/users</code>", "GET/POST/PUT/DELETE", "—", "Управління users (admin only)"],
              ["<code class='text-xs'>/api/serp-analyze</code>", "POST", "keyword, region, language", "SERP + скрапінг + AI-аналіз"],
              ["<code class='text-xs'>/api/generate-brief</code>", "POST", "keyword, language, region, serpData?, model?", "Генерація ТЗ"],
              ["<code class='text-xs'>/api/generate-content</code>", "POST", "topic, keywords, tone, wordCount, model?", "Генерація статті"],
              ["<code class='text-xs'>/api/lsi-analyze</code>", "POST", "keyword, region", "LSI-аналіз ТОП-10"],
              ["<code class='text-xs'>/api/pagespeed</code>", "GET", "?url=", "Аудит PageSpeed"],
              ["<code class='text-xs'>/api/seo-check</code>", "POST", "content, keywords, stats", "SEO-аналіз тексту"],
              ["<code class='text-xs'>/api/smart-linking</code>", "POST", "text, pages", "Рекомендації перелінковки"],
              ["<code class='text-xs'>/api/ai-detect</code>", "POST", "text", "Детекція AI-тексту"],
              ["<code class='text-xs'>/api/rewrite-fragment</code>", "POST", "fragments[]", "Переписати фрагменти"],
              ["<code class='text-xs'>/api/wp-publish</code>", "POST", "siteUrl, username, password, title, content", "Публікація в WordPress"],
              ["<code class='text-xs'>/api/semantic-cluster-stream</code>", "POST (SSE)", "keywords[], region", "Кластеризація з прогресом"],
              ["<code class='text-xs'>/api/plagiarism-stream</code>", "POST (SSE)", "text, lang", "Перевірка унікальності"],
              ["<code class='text-xs'>/api/fetch-competitor-headings</code>", "POST", "keyword, region", "Заголовки для OutlineBuilder"],
            ]}
          />

          <H3 id="api-error">Формат помилки</H3>
          <Code lang="json">{`
{
  "error": "Опис помилки",
  "overloaded": true    // true = Gemini перевантажений → клієнт активує Fallback
}
          `}</Code>
          <p className="text-sm">При перевантаженні Gemini сервер повертає HTTP <Badge color="orange">503</Badge> з <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">overloaded: true</code> — це сигнал для Smart Fallback.</p>

          {/* ── 6. Smart Fallback ───────────────────────────────────────────── */}
          <H2 id="fallback"><Rocket className="h-6 w-6 text-violet-500" />Smart Model Fallback</H2>
          <p className="mb-4 text-sm">Система автоматичного каскадного перемикання між моделями Gemini при перевантаженні.</p>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6">
            <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Ієрархія моделей
            </div>
            <div className="p-5 space-y-3">
              {[
                { model: "gemini-1.5-pro", badge: "Найпотужніша", color: "purple", sub: "Строгі ліміти, максимальна якість тексту" },
                { model: "gemini-2.0-flash", badge: "Збалансована", color: "blue", sub: "Швидка відповідь, ліміти вищі за Pro" },
                { model: "gemini-1.5-flash", badge: "Максимальна швидкість", color: "green", sub: "Найвищі ліміти, для пікових навантажень" },
              ].map(({ model, badge, color, sub }, i) => (
                <div key={model} className="flex items-start gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    color === "purple" ? "bg-purple-500" : color === "blue" ? "bg-blue-500" : "bg-emerald-500"
                  }`}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{model}</code>
                      <Badge color={color as "purple" | "blue" | "green"}>{badge}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
                  </div>
                  {i < 2 && (
                    <div className="shrink-0 text-xs text-zinc-400 mt-1 border border-dashed border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5">
                      429/503 →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Callout type="info">
            При <b>Автоматичному режимі</b> система починає з найпотужнішої моделі. При помилці перевантаження (<code>overloaded: true</code> або HTTP 503) автоматично переходить до наступної, показуючи toast-сповіщення. Увесь процес відбувається в рамках одного запиту — без повторного натискання.
          </Callout>

          <H3 id="fallback-code">Реалізація</H3>
          <Code lang="typescript">{`
// src/lib/geminiFallback.ts

export async function callWithModelFallback(
  endpoint: string,
  body: Record<string, unknown>,
  selectedModel: GeminiModelId,     // "auto" | "gemini-1.5-pro" | ...
  onModelChange?: (id: string, label: string) => void,
): Promise<{ data: Record<string, unknown>; modelUsed: string }> {

  const modelsToTry = selectedModel === "auto"
    ? GEMINI_MODELS.map((m) => m.id)   // всі три по черзі
    : [selectedModel];                  // тільки обраний

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    onModelChange?.(modelId, label);   // оновлює індикатор в UI

    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ ...body, model: modelId }),
    });

    if (res.ok) return { data: await res.json(), modelUsed: modelId };

    if ((res.status === 503 || data.overloaded) && i < modelsToTry.length - 1) {
      toast.warning(\`\${label} перевантажений, перемикаюсь на \${nextLabel}...\`);
      continue;  // наступна модель
    }

    throw new Error(data.error);
  }
}
          `}</Code>

          {/* ── 7. Інтеграції ──────────────────────────────────────────────── */}
          <H2 id="integrations"><Globe className="h-6 w-6 text-violet-500" />Інтеграції</H2>

          <H3 id="int-gemini">Google Gemini API</H3>
          <p className="text-sm mb-2">Єдина точка звернення — функція <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">callGemini()</code> у server/index.js.</p>
          <Code lang="bash">{`
URL:  https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
Auth: ?key=GEMINI_API_KEY (query param)

Параметри генерації:
  temperature:     0.8
  maxOutputTokens: 8192
  topP:            0.95
  timeout:         90s

Вбудований retry: при 503 до 3 спроб з паузою 3s × номер_спроби
          `}</Code>

          <H3 id="int-searxng">SearXNG</H3>
          <p className="text-sm mb-2">Локальний агрегатор пошуку в Docker на порту 8888. Повністю замінює платні SERP API.</p>
          <Code lang="bash">{`
# Запуск контейнера
docker-compose -f docker-compose.searxng.yml up -d

# Запит
GET http://127.0.0.1:8888/search?q=...&format=json&engines=google,bing&language=uk-UA

# Підтримувані мови: uk-UA · en-US · en-GB
          `}</Code>

          <H3 id="int-wordpress">WordPress REST API</H3>
          <p className="text-sm mb-2">Публікація статей напряму з інтерфейсу. Налаштовується в розділі Integrations для кожного облікового запису окремо. Дані зберігаються в localStorage прив'язано до username.</p>
          <Callout type="warn">
            WordPress потребує <b>Application Password</b> (не пароль облікового запису). Створюється в Профіль → Application Passwords у адмін-панелі WP.
          </Callout>

          <H3 id="int-supabase">Supabase</H3>
          <p className="text-sm">Email/password автентифікація, JWT-токени. База даних для зберігання метаданих. Конфігурується через <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> та <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.</p>

          {/* ── 8. Auth ──────────────────────────────────────────────────────── */}
          <H2 id="auth"><Shield className="h-6 w-6 text-violet-500" />Автентифікація та ролі</H2>

          <p className="text-sm mb-4">Система використовує <b>JWT-автентифікацію на рівні бекенду</b>. Паролі хешуються bcrypt (cost 12). Токени зберігаються в localStorage (ключ <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">cf_token</code>).</p>

          <H3 id="auth-flow">Процес входу</H3>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 my-4 space-y-3">
            {[
              { n: 1, label: "POST /api/auth/login", sub: "Клієнт надсилає username + password", color: "blue" },
              { n: 2, label: "bcrypt.compare()", sub: "Сервер порівнює пароль із хешем у SQLite", color: "green" },
              { n: 3, label: "jwt.sign()", sub: "Генерує JWT з payload: id, username, role, permissions. Expires: 7d", color: "purple" },
              { n: 4, label: "Bearer Token", sub: "Клієнт зберігає токен. Всі API-запити: Authorization: Bearer <token>", color: "orange" },
              { n: 5, label: "requireAuth middleware", sub: "Кожен захищений ендпоінт перевіряє підпис JWT", color: "pink" },
            ].map((s) => <FlowStep key={s.n} {...s} />)}
          </div>

          <H3 id="auth-endpoints">Auth API</H3>
          <Table
            headers={["Ендпоінт", "Auth", "Опис"]}
            rows={[
              ["<code class='text-xs'>POST /api/auth/login</code>", "Публічний", "Повертає JWT токен"],
              ["<code class='text-xs'>POST /api/auth/logout</code>", "Публічний", "Клієнт видаляє токен локально"],
              ["<code class='text-xs'>GET /api/auth/me</code>", "Bearer JWT", "Поточний користувач"],
              ["<code class='text-xs'>GET /api/auth/users</code>", "Admin JWT", "Список користувачів"],
              ["<code class='text-xs'>POST /api/auth/users</code>", "Admin JWT", "Створення користувача"],
              ["<code class='text-xs'>PUT /api/auth/users/:id</code>", "Admin JWT", "Оновлення (пароль/роль/дозволи)"],
              ["<code class='text-xs'>DELETE /api/auth/users/:id</code>", "Admin JWT", "Видалення (захист останнього адміна)"],
            ]}
          />

          <H3 id="auth-roles">Ролі та дозволи</H3>
          <Table
            headers={["Роль", "Доступ"]}
            rows={[
              ["<b>Незалогінений</b>", "Тільки лендінг (/) та сторінка входу (/login). Всі /api/* повертають 401"],
              ["<b>user</b>", "Інструменти відповідно до permissions[]. Дозволи задає адміністратор"],
              ["<b>admin</b>", "Все вище + /api/auth/users (CRUD) + доступ до всіх інструментів завжди"],
            ]}
          />

          <Callout type="warn">
            Дефолтний акаунт <b>admin / admin</b> створюється при першому запуску якщо база порожня. Змінити пароль одразу після деплою через /admin/users!
          </Callout>

          {/* ── 9. Security Audit ────────────────────────────────────────────── */}
          <H2 id="security-audit"><Shield className="h-6 w-6 text-red-500" />Аудит безпеки (2026-04-22)</H2>

          <p className="text-sm mb-4">Проведено повний аудит платформи. Нижче — всі знайдені вразливості, їх статус та заходи усунення.</p>

          <H3 id="audit-critical">🔴 Критичні (виправлено)</H3>
          <Table
            headers={["Вразливість", "Де", "Статус", "Виправлення"]}
            rows={[
              [
                "<b>Відсутність backend-автентифікації</b> — всі /api/* ендпоінти були відкриті без перевірки токену. Будь-хто, знаючи URL, міг читати/писати дані",
                "server/index.js",
                "<span class='text-green-600 font-semibold'>✓ Виправлено</span>",
                "Додано JWT middleware <code>requireAuth</code>. Всі /api/* маршрути (крім /api/health та /api/auth/*) вимагають Bearer token"
              ],
              [
                "<b>Паролі в plaintext у localStorage</b> — повний список користувачів + паролі зберігались у cf_users в браузері. XSS = злив всіх облікових даних",
                "AuthContext.tsx",
                "<span class='text-green-600 font-semibold'>✓ Виправлено</span>",
                "Паролі перенесено на сервер. bcrypt hash (cost 12) у SQLite. localStorage зберігає лише JWT токен без пароля"
              ],
            ]}
          />

          <H3 id="audit-high">🟠 Високі (виправлено)</H3>
          <Table
            headers={["Вразливість", "Де", "Статус", "Виправлення"]}
            rows={[
              [
                "<b>CORS wildcard</b> — app.use(cors()) без параметрів дозволяв запити з будь-якого домену",
                "server/index.js:21",
                "<span class='text-green-600 font-semibold'>✓ Виправлено</span>",
                "Whitelist: тільки https://aiagentlab.fun, https://www.aiagentlab.fun, localhost dev-порти. Інші → 403"
              ],
              [
                "<b>Відсутність rate limiting</b> — необмежена кількість запитів. Ризик вичерпання квоти Gemini API та DoS",
                "server/index.js",
                "<span class='text-green-600 font-semibold'>✓ Виправлено</span>",
                "express-rate-limit: загальний 60 req/хв, auth/login 20 req/15хв, важкі AI-ендпоінти 10 req/хв"
              ],
              [
                "<b>Health endpoint розкривав конфігурацію</b> — /api/health повертав GEMINI_MODEL та SEARXNG_URL",
                "server/index.js:264",
                "<span class='text-green-600 font-semibold'>✓ Виправлено</span>",
                "Health повертає тільки { status: 'ok' }"
              ],
            ]}
          />

          <H3 id="audit-medium">🟡 Середні (залишаються / прийняті ризики)</H3>
          <Table
            headers={["Вразливість", "Де", "Статус", "Коментар"]}
            rows={[
              [
                "<b>SSRF через scrapePage()</b> — функція скрапінгу приймає URL з результатів SearXNG без валідації. Теоретично можна передати внутрішній IP",
                "server/index.js:114",
                "<span class='text-yellow-600 font-semibold'>⚠ Прийнято</span>",
                "Після додавання auth SSRF вимагає авторизованого запиту. Для повного усунення — whitelist public IP діапазонів"
              ],
              [
                "<b>Відсутність Content-Security-Policy</b> — немає CSP заголовків у Caddy або Express",
                "Caddy / Express",
                "<span class='text-yellow-600 font-semibold'>⚠ Планується</span>",
                "Додати CSP в Caddyfile: default-src 'self', script-src з nonce. Знизить ризик XSS"
              ],
              [
                "<b>ClaudeCLI spawn передає повний process.env</b> — включно з GEMINI_API_KEY та JWT_SECRET через дочірній процес",
                "server/services/ClaudeCLIWrapper.js",
                "<span class='text-yellow-600 font-semibold'>⚠ Планується</span>",
                "Передавати мінімально необхідні змінні замість { ...process.env }"
              ],
            ]}
          />

          <H3 id="audit-low">🔵 Низькі (інфраструктура)</H3>
          <Table
            headers={["Проблема", "Де", "Рекомендація"]}
            rows={[
              [
                "<b>N8N encryption key hardcoded</b> у docker-compose.yml (публічний файл)",
                "docker-compose.yml:17",
                "Перенести в .env файл або Docker secret"
              ],
              [
                "<b>Postgres password hardcoded</b> у docker-compose.yml (superpass)",
                "docker-compose.yml:31",
                "Перенести в .env, надалі використати Docker Secrets"
              ],
              [
                "<b>auto_https disable_redirects</b> — відключає автоматичний HTTP→HTTPS редирект у Caddy",
                "/etc/caddy/Caddyfile:1",
                "Видалити або змінити на auto_https off для конкретного домену"
              ],
              [
                "<b>SQLite база не зашифрована</b>",
                "data/contentforge.db",
                "Прийнятний ризик для однокористувацького сервера. Для multi-tenant — SQLCipher"
              ],
            ]}
          />

          <H3 id="audit-summary">Підсумок аудиту</H3>
          <div className="grid sm:grid-cols-4 gap-3 my-4">
            {[
              { label: "Критичні", count: "2", status: "Виправлено", color: "bg-green-500" },
              { label: "Високі", count: "3", status: "Виправлено", color: "bg-green-500" },
              { label: "Середні", count: "3", status: "Планується", color: "bg-yellow-500" },
              { label: "Низькі", count: "4", status: "Відомі ризики", color: "bg-blue-500" },
            ].map(({ label, count, status, color }) => (
              <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900 text-center">
                <div className={`w-8 h-8 rounded-full ${color} text-white text-sm font-bold flex items-center justify-center mx-auto mb-2`}>{count}</div>
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{status}</p>
              </div>
            ))}
          </div>

          <Callout type="tip">
            Безпосередньо після деплою: <b>(1)</b> змінити пароль admin через /admin/users, <b>(2)</b> перенести N8N_ENCRYPTION_KEY і POSTGRES_PASSWORD з docker-compose в .env, <b>(3)</b> розглянути додавання CSP заголовків у Caddyfile.
          </Callout>

          {/* ── 9. Деплой ───────────────────────────────────────────────────── */}
          <H2 id="deploy"><Terminal className="h-6 w-6 text-violet-500" />Деплой та інфраструктура</H2>

          <H3 id="deploy-caddy">Caddy конфігурація</H3>
          <Code lang="caddy">{`
# /etc/caddy/Caddyfile

aiagentlab.fun, www.aiagentlab.fun {
    encode gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:3001 {
            flush_interval -1   # потрібно для SSE-потоків
        }
    }

    handle {
        root * /var/www/spec-writer-ai
        file_server
        try_files {path} /index.html  # SPA fallback
    }
}
          `}</Code>

          <H3 id="deploy-systemd">Systemd сервіс</H3>
          <Code lang="bash">{`
# /etc/systemd/system/contentforge-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/spec-writer-ai/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5

# Управління
systemctl status contentforge-api
systemctl restart contentforge-api
journalctl -u contentforge-api -f      # live логи
          `}</Code>

          <H3 id="deploy-steps">Кроки деплою</H3>
          <Code lang="bash">{`
# 1. Зібрати фронтенд
cd /root/spec-writer-ai
npm run build

# 2. Скопіювати в директорію Caddy
cp -r dist/. /var/www/spec-writer-ai/

# 3. Перезапустити API (якщо змінювався server/index.js)
systemctl restart contentforge-api

# Перевірка
curl http://127.0.0.1:3001/api/health
          `}</Code>

          {/* ── 10. ENV ─────────────────────────────────────────────────────── */}
          <H2 id="env"><Terminal className="h-6 w-6 text-violet-500" />Змінні оточення</H2>

          <H3 id="env-server">server/.env</H3>
          <Code lang="env">{`
# Google Gemini AI
# Отримати: https://aistudio.google.com → Get API key
GEMINI_API_KEY=ваш_ключ

# Модель за замовчуванням (коли модель не передається клієнтом)
GEMINI_MODEL=gemini-flash-latest

# SearXNG (локальний Docker)
SEARXNG_URL=http://127.0.0.1:8888

# Google PageSpeed Insights (необов'язково)
# Отримати: console.cloud.google.com → PageSpeed Insights API
PAGESPEED_API_KEY=ваш_ключ

# Порт Node.js сервера
PORT=3001
          `}</Code>

          <H3 id="env-frontend">.env (фронтенд, для локальної розробки)</H3>
          <Code lang="env">{`
# Supabase — отримати: supabase.com → Project Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
          `}</Code>

          {/* ── 11. Локальна розробка ───────────────────────────────────────── */}
          <H2 id="local"><Terminal className="h-6 w-6 text-violet-500" />Локальна розробка</H2>

          <H3 id="local-req">Вимоги</H3>
          <div className="flex gap-2 flex-wrap mb-4">
            <Badge color="blue">Node.js ≥ 18</Badge>
            <Badge color="blue">npm або bun</Badge>
            <Badge color="blue">Docker (для SearXNG)</Badge>
          </div>

          <H3 id="local-start">Запуск</H3>
          <Code lang="bash">{`
# 1. Встановити залежності фронтенду
npm install

# 2. Встановити залежності сервера
cd server && npm install && cd ..

# 3. Скопіювати та заповнити server/.env
cp server/.env.example server/.env
# → вставити GEMINI_API_KEY, SUPABASE ключі

# 4. Запустити SearXNG
docker-compose -f docker-compose.searxng.yml up -d

# 5. Запустити API-сервер (окремий термінал)
cd server && node index.js

# 6. Запустити dev-сервер фронтенду
npm run dev
# → http://localhost:8080
          `}</Code>

          <Callout type="info">
            Vite автоматично проксує всі запити <code>/api/*</code> на <code>localhost:3001</code> — налаштовано у <code>vite.config.ts</code>.
          </Callout>

          <H3 id="local-commands">Корисні команди</H3>
          <Code lang="bash">{`
npm run build           # Зібрати prod-версію в dist/
npm run dev             # Dev-сервер з hot-reload
npm run lint            # ESLint перевірка

# Логи на продакшені
journalctl -u contentforge-api -f

# Логи SearXNG
docker-compose -f docker-compose.searxng.yml logs -f

# Перевірка API
curl https://aiagentlab.fun/api/health
          `}</Code>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            <p>ContentForge · Закрита платформа · Доступ тільки за акаунтом</p>
            <a
              href="https://aiagentlab.fun"
              className="inline-flex items-center gap-1 mt-2 text-violet-500 hover:text-violet-700 transition-colors"
            >
              aiagentlab.fun <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
