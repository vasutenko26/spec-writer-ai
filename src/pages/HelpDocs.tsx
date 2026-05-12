import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, FileText, Sparkles, BarChart3, FileBarChart, Gauge,
  Network, Link2, Rocket, BookOpen, ChevronRight, ArrowRight,
  CheckCircle2, Zap, Lightbulb, AlertCircle, Play, Download,
  Globe, Copy, Check, ExternalLink,
} from "lucide-react";

// ── Primitives ────────────────────────────────────────────────────────────────

const Badge = ({ children, color = "violet" }: { children: React.ReactNode; color?: string }) => {
  const map: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    green:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    pink:   "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    cyan:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    rose:   "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    gray:   "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${map[color] ?? map.violet}`}>
      {children}
    </span>
  );
};

const Tip = ({ type = "tip", children }: { type?: "tip" | "info" | "warn"; children: React.ReactNode }) => {
  const cfg = {
    tip:  { cls: "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30", icon: <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />, label: "Порада" },
    info: { cls: "border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/30", icon: <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />, label: "Важливо" },
    warn: { cls: "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30", icon: <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, label: "Увага" },
  }[type];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 my-4 text-sm ${cfg.cls}`}>
      {cfg.icon}
      <div className="text-zinc-700 dark:text-zinc-300"><span className="font-semibold">{cfg.label}: </span>{children}</div>
    </div>
  );
};

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex gap-3 items-start py-2">
    <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
      {n}
    </div>
    <div>
      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{title}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const CopySnippet = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <span
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="inline-flex items-center gap-1.5 cursor-pointer font-mono text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors select-none"
    >
      {ok ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-zinc-400" />}
      {text}
    </span>
  );
};

// ── Section wrappers ──────────────────────────────────────────────────────────

const H2 = ({ id, icon: Icon, color, children }: { id: string; icon: React.ElementType; color: string; children: React.ReactNode }) => (
  <h2 id={id} className="flex items-center gap-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-16 mb-6 pb-3 border-b border-zinc-200 dark:border-zinc-800 scroll-mt-20">
    <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    {children}
  </h2>
);

const H3 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h3 id={id} className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-8 mb-3 scroll-mt-20">
    {children}
  </h3>
);

// ── TOC ───────────────────────────────────────────────────────────────────────

const TOC = [
  { id: "workflow",   label: "Як починати роботу",     icon: Play },
  { id: "serp",       label: "Аналіз видачі",          icon: Search },
  { id: "brief",      label: "Генерація ТЗ",           icon: FileText },
  { id: "content",    label: "Генерація контенту",     icon: Sparkles },
  { id: "seo",        label: "SEO-перевірка",          icon: BarChart3 },
  { id: "lsi",        label: "LSI-аналіз",             icon: FileBarChart },
  { id: "pagespeed",  label: "PageSpeed аудит",        icon: Gauge },
  { id: "cluster",    label: "Кластеризація",          icon: Network },
  { id: "linking",    label: "Перелінковка",           icon: Link2 },
  { id: "campaign",   label: "Автокампанія",           icon: Rocket },
  { id: "export",     label: "Експорт і публікація",   icon: Download },
  { id: "faq",        label: "Часті питання",          icon: BookOpen },
];

// ═════════════════════════════════════════════════════════════════════════════
const HelpDocs = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState("workflow");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const sections = TOC.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      let cur = sections[0]?.id ?? "workflow";
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= 96) cur = el.id;
      }
      setActiveId(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">ContentForge</span>
            </button>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-sm text-zinc-500">Довідник</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
          >
            Відкрити платформу <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-violet-50 via-indigo-50/30 to-white dark:from-violet-950/30 dark:via-indigo-950/10 dark:to-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <Badge color="violet"><BookOpen className="h-3 w-3" /> Довідник користувача</Badge>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
            Як користуватися<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">ContentForge</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400 max-w-xl">
            Повний посібник по всіх інструментах платформи — від аналізу конкурентів до публікації готової статті у WordPress.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { icon: Search,      label: "SERP",        color: "blue" },
              { icon: FileText,    label: "ТЗ",          color: "violet" },
              { icon: Sparkles,    label: "Контент",     color: "purple" },
              { icon: BarChart3,   label: "SEO",         color: "orange" },
              { icon: Rocket,      label: "Автокампанія",color: "pink" },
              { icon: Network,     label: "Кластери",    color: "cyan" },
              { icon: Link2,       label: "Перелінковка",color: "rose" },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 shadow-sm">
                <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-10 py-10">

        {/* TOC sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3 px-2">Зміст</p>
            <nav className="space-y-0.5">
              {TOC.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => go(id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
                    activeId === id
                      ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main ref={mainRef} className="flex-1 min-w-0 max-w-3xl">

          {/* ── Workflow ───────────────────────────────────────────────────── */}
          <H2 id="workflow" icon={Play} color="bg-gradient-to-br from-violet-500 to-indigo-600">
            Як починати роботу
          </H2>

          <p className="mb-6 text-sm leading-relaxed">
            ContentForge — це набір взаємопов'язаних SEO-інструментів. Є два способи роботи: покроковий (кожен інструмент окремо) та автоматичний (Комбайн все за один запуск).
          </p>

          {/* Workflow diagram */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
            <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Рекомендований покроковий сценарій</p>
            </div>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
                {[
                  { n: "01", label: "Аналіз видачі", color: "bg-blue-500", path: "/tools/serp" },
                  { n: "→", label: "", color: "" },
                  { n: "02", label: "Генерація ТЗ", color: "bg-violet-500", path: "/tools/brief" },
                  { n: "→", label: "", color: "" },
                  { n: "03", label: "Генерація тексту", color: "bg-purple-500", path: "/tools/content" },
                  { n: "→", label: "", color: "" },
                  { n: "04", label: "SEO-перевірка", color: "bg-orange-500", path: "/tools/seo" },
                ].map((item, i) =>
                  item.n === "→" ? (
                    <ChevronRight key={i} className="h-4 w-4 text-zinc-300 dark:text-zinc-600 shrink-0 hidden sm:block" />
                  ) : (
                    <button
                      key={i}
                      onClick={() => navigate(item.path!)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
                    >
                      <span className={`w-6 h-6 rounded-md ${item.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{item.n}</span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{item.label}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <Tip type="tip">
            Результати кожного кроку автоматично передаються на наступний. Зробили аналіз видачі — дані вже чекають у генераторі ТЗ, натискайте "Є дані" та переходьте далі.
          </Tip>

          <div className="grid sm:grid-cols-2 gap-3 my-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Покроковий режим
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">Кожен інструмент окремо. Більше контролю: можна переглядати і редагувати результати між кроками.</p>
            </div>
            <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 p-4 bg-violet-50 dark:bg-violet-950/30">
              <p className="font-semibold text-sm text-violet-700 dark:text-violet-300 mb-2 flex items-center gap-2">
                <Rocket className="h-4 w-4" /> Автоматичний режим
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">Один ввід — повний цикл. Ідеально для масового виробництва контенту, коли структура вже зрозуміла.</p>
            </div>
          </div>

          {/* ── SERP ───────────────────────────────────────────────────────── */}
          <H2 id="serp" icon={Search} color="bg-blue-500">
            Аналіз пошукової видачі
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Перший і найважливіший крок. Інструмент аналізує ТОП-10 Google за вашим ключовим словом: збирає заголовки, підраховує слова та структуру кожного конкурента, а потім просить Gemini AI зробити висновки.
          </p>

          <H3 id="serp-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Введіть ключове слово" desc='Наприклад: "купити ноутбук для роботи" або "як вибрати матрас". Чим точніший запит — тим точніший аналіз.' />
            <Step n={2} title="Оберіть регіон" desc="Україна, США або Європа. Впливає на мову запиту до пошукача та відображені результати." />
            <Step n={3} title="Натисніть «Аналізувати»" desc="Система збирає ТОП-10, скрапить кожну сторінку та аналізує структуру. Займає 15–30 секунд." />
            <Step n={4} title="Перегляньте результати" desc="Таблиця конкурентів, їхні заголовки, AI-аналіз пошукового наміру та рекомендації." />
          </div>

          <Tip type="tip">Після аналізу натисніть «Перейти до генерації ТЗ» — всі дані про конкурентів автоматично передаються без повторного запиту.</Tip>

          <H3 id="serp-output">Що ви отримаєте</H3>
          <ul className="text-sm space-y-1.5 text-zinc-600 dark:text-zinc-400 mb-4">
            {[
              "Таблиця ТОП-10: URL, кількість слів, H2, H3, зображень",
              "Повні заголовки H1–H3 кожного конкурента",
              "AI-аналіз: пошуковий намір, типи контенту, ключові теми",
              "Рекомендований обсяг та структура нового матеріалу",
            ].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}</li>
            ))}
          </ul>

          {/* ── Brief ──────────────────────────────────────────────────────── */}
          <H2 id="brief" icon={FileText} color="bg-gradient-to-br from-violet-500 to-indigo-600">
            Генерація ТЗ
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Генерує детальне технічне завдання у форматі Markdown. ТЗ містить усе, що потрібно копірайтеру: параметри, LSI-слова, структуру заголовків, FAQ, мета-теги та slug.
          </p>

          <H3 id="brief-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Перейдіть з даними SERP або введіть ключове слово заново" desc="Якщо ви щойно зробили аналіз видачі, дані вже підставлені. Якщо ні — введіть ключове слово." />
            <Step n={2} title="Оберіть тип контенту" desc="Інформаційна стаття, лендінг, картка товару або сторінка категорії. Впливає на структуру ТЗ." />
            <Step n={3} title="Налаштуйте структуру (опційно)" desc="Увімкніть Конструктор структури, щоб обрати заголовки з конкурентів або додати власні H2/H3." />
            <Step n={4} title="Натисніть «Згенерувати ТЗ»" desc="Gemini AI формує ТЗ з урахуванням реальних даних конкурентів." />
          </div>

          <Tip type="info">
            Щоб передати ТЗ до генерації контенту, натисніть кнопку <strong>«Генерувати контент за цим ТЗ»</strong> — вміст ТЗ автоматично підставиться як завдання.
          </Tip>

          <H3 id="brief-structure">Що у ТЗ</H3>
          <div className="grid sm:grid-cols-2 gap-2 my-4 text-xs">
            {[
              "Мета і результат",
              "Таблиця конкурентів ТОП-10",
              "Рекомендований обсяг (мін/рек/макс)",
              "LSI-слова з частотою вживань",
              "Структура заголовків H1–H3",
              "Вимоги до FAQ (5–8 питань)",
              "Мета-теги та slug (2–3 варіанти)",
              "Вимоги до формату здачі",
            ].map((t) => (
              <div key={t} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-zinc-600 dark:text-zinc-400">{t}</span>
              </div>
            ))}
          </div>

          {/* ── Content ────────────────────────────────────────────────────── */}
          <H2 id="content" icon={Sparkles} color="bg-purple-500">
            AI-генерація контенту
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Генерує повноцінну SEO-статтю. Використовує спеціальний промпт із правилами природного письма, щоб уникнути «AI-штампів» та покращити унікальність тексту.
          </p>

          <H3 id="content-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Вставте ТЗ або введіть тему" desc="Якщо прийшли з генератора ТЗ — вміст вже підставлено. Можна також ввести просто тему або довільне завдання." />
            <Step n={2} title="Додайте ключові слова" desc="Через кому. Система слідкує, щоб вони вживалися природно (щільність 1.5–2.5%)." />
            <Step n={3} title="Оберіть тон тексту" desc="Інформаційний, Комерційний, Експертний або Розмовний — кожен змінює стиль і структуру статті." />
            <Step n={4} title="Встановіть обсяг" desc="Повзунок від 500 до 5000 слів." />
            <Step n={5} title="Оберіть модель Gemini" desc="Автоматичний режим починає з найпотужнішої моделі і переходить на швидшу якщо та зайнята." />
          </div>

          <H3 id="content-models">Вибір моделі Gemini</H3>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-4">
            {[
              { name: "⚡ Автоматичний режим", sub: "Рекомендовано", desc: "Починає з Gemini 1.5 Pro. При перевантаженні автоматично перемикається на Flash. Ви ніколи не отримаєте помилку через зайнятість сервера.", color: "bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/40" },
              { name: "Gemini 1.5 Pro", sub: "Найпотужніша", desc: "Найкраща якість тексту, глибший аналіз. Строгіші ліміти — може бути зайнятою в піковий час.", color: "border-b border-zinc-100 dark:border-zinc-800" },
              { name: "Gemini 2.0 Flash", sub: "Збалансована", desc: "Швидка відповідь та гарна якість. Оптимальний вибір для регулярного контент-продакшену.", color: "border-b border-zinc-100 dark:border-zinc-800" },
              { name: "Gemini 1.5 Flash", sub: "Максимальна швидкість", desc: "Найвищі ліміти, найшвидша генерація. Підходить для великих обсягів.", color: "" },
            ].map(({ name, sub, desc, color }) => (
              <div key={name} className={`px-4 py-3 ${color}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</span>
                  <Badge color="gray">{sub}</Badge>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <Tip type="tip">
            Під час генерації ви бачите напис <strong>«⚡ Використовується: Gemini 2.0 Flash»</strong> — так ви знаєте, яка модель зараз активна.
          </Tip>

          {/* ── SEO Checker ────────────────────────────────────────────────── */}
          <H2 id="seo" icon={BarChart3} color="bg-orange-500">
            SEO-перевірка тексту
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Аналізує готовий текст і дає конкретні рекомендації від Gemini. Показує метрики структури, щільність ключових слів та виявляє слабкі місця.
          </p>

          <H3 id="seo-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Вставте текст" desc="Скопіюйте згенерований або написаний вручну матеріал у поле." />
            <Step n={2} title="Додайте ключові слова для перевірки щільності" desc="Через кому. Система покаже, скільки разів кожне слово вжите та відсоток щільності." />
            <Step n={3} title="Натисніть «Перевірити»" desc="Gemini AI аналізує текст і формує рекомендації за 4 категоріями." />
          </div>

          <H3 id="seo-output">Що аналізується</H3>
          <div className="grid grid-cols-2 gap-2 my-4 text-xs">
            {[
              { title: "📖 Читабельність", desc: "Складність тексту, довжина речень, рівень аудиторії" },
              { title: "🏗 Структура", desc: "Логіка заголовків, розбивка на розділи, наявність списків" },
              { title: "🔍 SEO-оптимізація", desc: "Щільність КС, природність інтеграції, покриття теми" },
              { title: "✅ Рекомендації", desc: "4–6 конкретних покращень з прикладами" },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{title}</p>
                <p className="text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* ── LSI ────────────────────────────────────────────────────────── */}
          <H2 id="lsi" icon={FileBarChart} color="bg-cyan-500">
            LSI та TF-IDF аналіз
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Збирає семантично пов'язані слова з реальних текстів ТОП-10 конкурентів. Показує, які слова і скільки разів потрібно вжити у своїй статті, щоб відповідати очікуванням пошуковика.
          </p>

          <H3 id="lsi-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Введіть ключове слово" desc="Те ж саме, за яким плануєте писати статтю." />
            <Step n={2} title="Оберіть регіон" desc="Впливає на мовну версію SERP." />
            <Step n={3} title="Натисніть «Аналізувати»" desc="Система збирає тексти ТОП-10 і підраховує частоту кожного слова." />
            <Step n={4} title="Використайте LSI-слова" desc="Стовпець «Рекомендовано» показує цільову кількість вживань для конкурентоспроможного контенту." />
          </div>

          <H3 id="lsi-table">Що означають стовпці таблиці</H3>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-4">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {["Стовпець", "Що означає"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Зустрічається", "На скількох сторінках ТОП-10 є це слово (з 10)"],
                  ["Частота", "Загальна кількість вживань по всіх сторінках"],
                  ["Рекомендовано", "Скільки разів варто вжити у вашій статті (~середнє по ТОП)"],
                ].map(([col, desc]) => (
                  <tr key={col} className="border-b border-zinc-100 dark:border-zinc-800 even:bg-zinc-50/50 dark:even:bg-zinc-900/30">
                    <td className="px-4 py-2.5 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{col}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip type="tip">Результати LSI-аналізу можна завантажити в Excel — зручно передавати копірайтеру разом з ТЗ.</Tip>

          {/* ── PageSpeed ──────────────────────────────────────────────────── */}
          <H2 id="pagespeed" icon={Gauge} color="bg-emerald-500">
            Технічний SEO-аудит (PageSpeed)
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Перевіряє технічну якість будь-якої сторінки через Google PageSpeed Insights. Показує 4 ключові метрики (0–100) та детальний список проблем.
          </p>

          <H3 id="ps-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Введіть URL сторінки" desc="Наприклад URL конкурента або вашої власної сторінки після публікації." />
            <Step n={2} title="Натисніть «Аудит»" desc="Займає 10–20 секунд." />
            <Step n={3} title="Перегляньте метрики" desc="Зелений (≥90) — добре, оранжевий (≥50) — є проблеми, червоний — критично." />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
            {[
              { label: "Performance", desc: "Швидкість завантаження" },
              { label: "Accessibility", desc: "Доступність" },
              { label: "Best Practices", desc: "Кращі практики" },
              { label: "SEO", desc: "On-page SEO" },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900 text-center">
                <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          {/* ── Cluster ────────────────────────────────────────────────────── */}
          <H2 id="cluster" icon={Network} color="bg-violet-500">
            Кластеризатор семантики
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Групує список ключових слів за принципом спільних URL у пошуковій видачі. Допомагає визначити, які запити можна покрити однією сторінкою, а які потребують окремих.
          </p>

          <H3 id="cluster-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Вставте список ключових слів" desc="Кожне слово з нового рядка або через кому. До 100 ключів." />
            <Step n={2} title="Оберіть регіон" desc="Регіон впливає на те, яку видачу порівнює система." />
            <Step n={3} title="Запустіть кластеризацію" desc="Система робить запит для кожного КС та порівнює URL в ТОП-5. Прогрес відображається в реальному часі." />
            <Step n={4} title="Перегляньте кластери" desc="КС в одному кластері → можна писати одну сторінку. КС у різних → потрібні окремі сторінки." />
          </div>

          <Tip type="warn">
            Кластеризація великих списків займає час — до 1–2 хвилин для 50+ ключів. Не закривайте вкладку під час аналізу.
          </Tip>

          {/* ── Smart Linking ──────────────────────────────────────────────── */}
          <H2 id="linking" icon={Link2} color="bg-rose-500">
            Розумна перелінковка
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Аналізує ваш текст і пропонує 3–5 місць, де природно вписати внутрішні посилання. Для кожного місця пропонує анкор і пояснює, чому саме тут.
          </p>

          <H3 id="linking-how">Як користуватися</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Вставте текст статті" desc="Той, в який хочете додати внутрішні посилання." />
            <Step n={2} title="Додайте список сторінок сайту" desc="URL та короткий опис кожної сторінки, на яку хочете посилатися." />
            <Step n={3} title="Натисніть «Знайти місця для посилань»" desc="Gemini визначить найкращі місця та анкори." />
          </div>

          <H3 id="linking-output">Що ви отримаєте</H3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Для кожного посилання: фрагмент тексту з контекстом → URL → рекомендований анкор → обґрунтування вибору.
          </p>

          {/* ── Campaign ───────────────────────────────────────────────────── */}
          <H2 id="campaign" icon={Rocket} color="bg-gradient-to-br from-violet-500 to-pink-500">
            Автоматична SEO-кампанія (Комбайн)
          </H2>

          <p className="text-sm mb-4 leading-relaxed">
            Флагманський інструмент. Одне ключове слово — і система сама робить усе: аналізує конкурентів, збирає LSI, генерує ТЗ і пише статтю. Без вашої участі, поки ви п'єте каву.
          </p>

          {/* Campaign flow visual */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6">
            <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">5 кроків за один запуск</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[
                { n: 1, icon: Search,      label: "Аналіз видачі",    sub: "ТОП-10 конкурентів з усіма даними", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
                { n: 2, icon: Gauge,       label: "Технічний аудит",  sub: "PageSpeed першого конкурента або вашого URL", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
                { n: 3, icon: FileBarChart,label: "LSI-аналіз",       sub: "Семантичне ядро з частотами вживань", color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" },
                { n: 4, icon: FileText,    label: "Генерація ТЗ",     sub: "Повне ТЗ з даними SERP та LSI-словами", color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30" },
                { n: 5, icon: Sparkles,    label: "Генерація статті", sub: "SEO-стаття на основі ТЗ та топ LSI-слів", color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
              ].map(({ n, icon: Icon, label, sub, color }) => (
                <div key={n} className={`flex items-center gap-4 px-5 py-4 ${color}`}>
                  <div className="shrink-0 w-7 h-7 rounded-full bg-white dark:bg-zinc-950 border-2 border-current flex items-center justify-center text-xs font-bold">
                    {n}
                  </div>
                  <Icon className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{label}</p>
                    <p className="text-xs text-zinc-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <H3 id="campaign-how">Як запустити</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Введіть головне ключове слово" desc='Наприклад: "купити кавоварку". Вся кампанія будується навколо нього.' />
            <Step n={2} title="Вкажіть URL конкурента (опційно)" desc="Якщо хочете аудитувати конкретний сайт, а не перший результат пошуку." />
            <Step n={3} title="Оберіть модель Gemini" desc="Рекомендується Автоматичний режим — кампанія не зупиниться навіть якщо одна модель зайнята." />
            <Step n={4} title="Натисніть «Запустити кампанію»" desc="Спостерігайте за прогресом по кроках. Кожен крок підсвічується коли виконується." />
            <Step n={5} title="Отримайте результати" desc="ТЗ, стаття та LSI-таблиця у трьох вкладках. Завантажте все разом або окремо." />
          </div>

          <H3 id="campaign-structure">Ручне налаштування структури</H3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Увімкніть чекбокс <strong>«Ручне налаштування структури»</strong> перед запуском. Кампанія зупиниться після кроку 3 і відкриє <strong>Конструктор структури</strong> — ви побачите заголовки всіх 10 конкурентів і зможете обрати або дописати власні H2/H3. Після підтвердження кампанія продовжиться з вашою структурою.
          </p>

          <Tip type="tip">
            Після завершення кампанії всі матеріали можна завантажити: ТЗ → Word, Стаття → Word, дані → Excel (.xlsx з LSI-таблицею та зведенням).
          </Tip>

          {/* ── Export & Publish ───────────────────────────────────────────── */}
          <H2 id="export" icon={Download} color="bg-zinc-700 dark:bg-zinc-600">
            Експорт і публікація
          </H2>

          <p className="text-sm mb-6 leading-relaxed">
            Будь-який згенерований контент можна одразу завантажити або опублікувати.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {[
              { icon: Download, title: "Word (.docx)", desc: "Будь-який текст або ТЗ — завантажується з форматованими заголовками.", color: "text-blue-500" },
              { icon: Download, title: "Excel (.xlsx)", desc: "LSI-слова та зведення кампанії з усіма метриками.", color: "text-emerald-500" },
              { icon: Globe,    title: "WordPress",     desc: "Пряма публікація на ваш сайт. Налаштовується в розділі Інтеграції.", color: "text-violet-500" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900">
                <Icon className={`h-5 w-5 ${color} mb-2`} />
                <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mb-1">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <H3 id="export-wp">Налаштування WordPress</H3>
          <div className="space-y-2 mb-4">
            <Step n={1} title="Перейдіть до розділу Інтеграції" desc="Кнопка в шапці на будь-якій сторінці платформи." />
            <Step n={2} title="Введіть URL сайту та логін" desc='Наприклад: "https://mysite.com" та ваш логін WordPress.' />
            <Step n={3} title="Створіть Application Password у WordPress" desc="Адмін-панель WP → Профіль → Application Passwords → введіть назву → Generate. Скопіюйте пароль." />
            <Step n={4} title="Вставте Application Password" desc="Не звичайний пароль, а згенерований Application Password." />
            <Step n={5} title="Збережіть та публікуйте" desc="Тепер кнопка «WordPress» з'явиться поруч з готовими статтями." />
          </div>

          <Tip type="warn">
            Application Password відрізняється від вашого пароля облікового запису WordPress. Його потрібно створити окремо в розділі Профіль.
          </Tip>

          {/* ── FAQ ────────────────────────────────────────────────────────── */}
          <H2 id="faq" icon={BookOpen} color="bg-zinc-700 dark:bg-zinc-600">
            Часті питання
          </H2>

          <div className="space-y-4">
            {[
              {
                q: "Чи зберігаються мої дані між сесіями?",
                a: "Результати інструментів зберігаються в межах однієї сесії та в Журналі дій (локально). При виході та повторному вході журнал збережеться, але активні дані між інструментами скидаються.",
              },
              {
                q: "Що таке LSI-слова і навіщо вони потрібні?",
                a: "LSI (Latent Semantic Indexing) — семантично пов'язані слова, які пошуковик очікує бачити в якісному матеріалі на певну тему. Їх наявність сигналізує про «глибину» та «авторитетність» контенту. Рекомендована кількість вживань показує, скільки разів ці слова зустрічаються у конкурентів ТОП-10.",
              },
              {
                q: "Чому з'являється повідомлення про перевантаження Gemini?",
                a: "Google Gemini API має ліміти запитів. При Автоматичному режимі модели система автоматично перемикається на наступну без вашої участі. При ручному виборі конкретної моделі — спробуйте перейти на автоматичний або обрати Flash-версію.",
              },
              {
                q: "Скільки часу займає повна автоматична кампанія?",
                a: "Залежно від складності запиту та доступності моделей — від 2 до 5 хвилин. Більша частина часу йде на скрапінг конкурентів та генерацію AI-тексту.",
              },
              {
                q: "Чи можна використовувати інструменти незалежно?",
                a: "Так, кожен інструмент працює самостійно. Але разом вони ефективніші — результати одного автоматично підставляються до наступного, економлячи час і роблячи аналіз точнішим.",
              },
              {
                q: "Чому кластеризація займає так довго?",
                a: "Для кожного ключового слова потрібно зробити окремий запит до пошуковика і порівняти результати. При 50 ключових словах це 50 окремих пошукових запитів з паузами між ними.",
              },
              {
                q: "Як отримати найкращий результат від генерації тексту?",
                a: "Передавайте повноцінне ТЗ, а не просто тему. Чим детальніше завдання — тим якісніша стаття. Використовуйте LSI-слова з аналізатора та перевіряйте результат SEO-чекером.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{q}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-4 pt-0 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800">
                  {a}
                </div>
              </details>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/50 p-8 text-center">
            <Zap className="h-8 w-8 text-violet-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Готові почати?</h3>
            <p className="text-sm text-zinc-500 mb-6">Почніть з аналізу видачі або запустіть автоматичну кампанію.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => navigate("/tools/serp")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
              >
                <Search className="h-4 w-4" /> Аналіз видачі
              </button>
              <button
                onClick={() => navigate("/tools/campaign")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold transition-colors"
              >
                <Rocket className="h-4 w-4" /> Автокампанія
              </button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            ContentForge · Довідник користувача
          </div>
        </main>
      </div>
    </div>
  );
};

export default HelpDocs;
