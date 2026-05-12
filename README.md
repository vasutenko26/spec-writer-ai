# ContentForge — SEO-платформа на базі Gemini AI

> **Живий сайт:** [https://aiagentlab.fun](https://aiagentlab.fun)

ContentForge — це повноцінна SEO-платформа для автоматизованого створення контенту. Система збирає дані з пошукової видачі, аналізує конкурентів, генерує технічні завдання та SEO-статті через Google Gemini AI. Усе це — в одному інтерфейсі, без зовнішніх платних сервісів.

---

## Зміст

1. [Архітектура системи](#1-архітектура-системи)
2. [Технологічний стек](#2-технологічний-стек)
3. [Структура проєкту](#3-структура-проєкту)
4. [Інструменти платформи](#4-інструменти-платформи)
5. [API-ендпоінти](#5-api-ендпоінти)
6. [Smart Model Fallback](#6-smart-model-fallback)
7. [Інтеграції](#7-інтеграції)
8. [Автентифікація та ролі](#8-автентифікація-та-ролі)
9. [Деплой та інфраструктура](#9-деплой-та-інфраструктура)
10. [Змінні оточення](#10-змінні-оточення)
11. [Локальна розробка](#11-локальна-розробка)

---

## 1. Архітектура системи

```
                        ┌─────────────────────────────┐
                        │   Браузер користувача        │
                        │   React + Vite SPA           │
                        └────────────┬────────────────┘
                                     │ HTTPS
                        ┌────────────▼────────────────┐
                        │   Caddy (reverse proxy)      │
                        │   aiagentlab.fun             │
                        │                              │
                        │  /api/*  → :3001             │
                        │  /*      → /var/www/dist     │
                        └──────┬───────────────────────┘
                               │
               ┌───────────────▼───────────────┐
               │   Node.js + Express API        │
               │   /root/spec-writer-ai/server  │
               │   Порт: 3001 (localhost only)  │
               └───┬───────────────┬────────────┘
                   │               │
      ┌────────────▼──┐    ┌───────▼──────────────┐
      │  Google Gemini │    │  SearXNG (Docker)     │
      │  AI API        │    │  Порт: 8888           │
      │  (зовнішній)   │    │  (локальний пошук)    │
      └────────────────┘    └──────────────────────┘
               │
      ┌────────▼────────────┐
      │  Supabase            │
      │  (auth + database)   │
      │  (зовнішній SaaS)    │
      └─────────────────────┘
```

**Принцип роботи:**
- Фронтенд — статичний SPA (зібраний Vite), роздається Caddy з `/var/www/spec-writer-ai`
- Усі запити до `/api/*` Caddy проксує на Node.js сервер (порт 3001)
- Node.js сервер звертається до Gemini API для генерації тексту та до SearXNG для збору SERP-даних
- Автентифікація через Supabase (JWT-токени)
- SearXNG — локальний агрегатор пошуку в Docker, замінює платні SERP API

---

## 2. Технологічний стек

### Фронтенд
| Технологія | Версія | Призначення |
|---|---|---|
| React | 18.3 | UI-фреймворк |
| TypeScript | 5.x | Типізація |
| Vite | 5.4 | Збірка та dev-сервер |
| TailwindCSS | 3.x | Стилі |
| shadcn/ui | — | UI-компоненти (Radix UI) |
| React Router | v6 | Навігація |
| TanStack Query | v5 | Серверний стан |
| Sonner | — | Toast-сповіщення |
| ReactMarkdown | — | Рендер Markdown |
| XLSX + FileSaver | — | Експорт у Excel |
| docx | — | Експорт у Word (.docx) |

### Бекенд
| Технологія | Призначення |
|---|---|
| Node.js (ESM) | Runtime |
| Express 4 | HTTP-сервер |
| node-html-parser | Парсинг HTML конкурентів |
| marked | Markdown → HTML |
| dotenv | Змінні оточення |

### Інфраструктура
| Компонент | Призначення |
|---|---|
| Debian VPS | Хостинг |
| Caddy | Reverse proxy + TLS |
| systemd | Управління сервісом API |
| Docker | SearXNG-контейнер |
| Supabase | Auth + PostgreSQL |
| Google Gemini API | AI-генерація |
| Google PageSpeed API | Технічний аудит |

---

## 3. Структура проєкту

```
spec-writer-ai/
│
├── src/                          # Фронтенд (React + TypeScript)
│   ├── pages/                    # Сторінки (кожна = маршрут)
│   │   ├── LandingPage.tsx       # Лендінг для незалогінених
│   │   ├── LoginPage.tsx         # Сторінка входу
│   │   ├── Dashboard.tsx         # Головна панель після входу
│   │   ├── SerpAnalysis.tsx      # Аналіз пошукової видачі
│   │   ├── BriefTool.tsx         # Генерація ТЗ
│   │   ├── ContentTool.tsx       # AI-генерація контенту
│   │   ├── CampaignTool.tsx      # Автоматична кампанія
│   │   ├── LsiTool.tsx           # LSI-аналіз
│   │   ├── PageSpeedTool.tsx     # Аудит PageSpeed
│   │   ├── SemanticClusterTool.tsx # Семантична кластеризація
│   │   ├── SeoChecker.tsx        # SEO-перевірка тексту
│   │   ├── SmartLinkingTool.tsx  # Розумна перелінковка
│   │   ├── HistoryPage.tsx       # Журнал дій
│   │   ├── IntegrationsPage.tsx  # Налаштування WordPress
│   │   └── UsersAdmin.tsx        # Адмін: управління юзерами
│   │
│   ├── components/
│   │   ├── AppLayout.tsx         # Загальний layout з сайдбаром
│   │   ├── BriefForm.tsx         # Форма генерації ТЗ
│   │   ├── BriefResult.tsx       # Результат ТЗ
│   │   ├── ContentForm.tsx       # Форма генерації контенту
│   │   ├── WordPressModal.tsx    # Модал публікації в WP
│   │   ├── ProtectedRoute.tsx    # HOC захисту маршруту
│   │   └── tools/
│   │       ├── Campaign.tsx      # Логіка автокампанії
│   │       ├── ContentQuality.tsx # Аналіз якості тексту
│   │       ├── LsiAnalyzer.tsx   # UI LSI-аналізу
│   │       ├── OutlineBuilder.tsx # Конструктор структури
│   │       ├── PageSpeedAudit.tsx # UI аудиту PageSpeed
│   │       ├── SemanticCluster.tsx # UI кластеризації
│   │       └── SmartLinking.tsx  # UI перелінковки
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Стан авторизації (Supabase)
│   │   ├── AppStateContext.tsx   # Спільний стан між інструментами
│   │   └── HistoryContext.tsx    # Журнал дій користувача
│   │
│   ├── lib/
│   │   ├── geminiFallback.ts    # Smart Model Fallback логіка
│   │   ├── exportDocx.ts        # Експорт Markdown → Word
│   │   └── wordpress.ts         # WordPress REST API клієнт
│   │
│   └── hooks/
│       └── use-toast.ts         # Hook для toast-сповіщень
│
├── server/
│   ├── index.js                 # Весь бекенд (Express + усі роути)
│   ├── package.json             # Залежності сервера
│   └── .env                     # Ключі API (не в git)
│
├── dist/                        # Зібраний фронтенд (після npm run build)
├── public/                      # Статичні файли
├── docker-compose.searxng.yml  # Docker для SearXNG
└── searxng/                     # Конфіг SearXNG
```

---

## 4. Інструменти платформи

### 4.1 Аналіз пошукової видачі (SERP Analysis)
**Маршрут:** `/serp-analysis`

Аналізує ТОП-10 Google за ключовим словом:
1. Робить запит до локального SearXNG (агрегує Google + Bing)
2. Скрапить HTML кожної сторінки з ТОП-10 (паралельно, таймаут 8с)
3. Витягує заголовки H1–H6, підраховує слова, зображення, списки
4. Надсилає зібрані дані до Gemini → отримує AI-аналіз: пошуковий намір, типи контенту, рекомендації
5. Результати кешуються в AppStateContext для передачі в інструмент генерації ТЗ

**Вихід:** таблиця конкурентів, заголовки, AI-аналіз, статистика (сер. кількість слів, H2, H3)

---

### 4.2 Генерація ТЗ (Brief Tool)
**Маршрут:** `/brief`

Створює детальне технічне завдання для копірайтера у форматі Markdown:
- Якщо є дані з SERP Analysis — використовує їх (не робить новий запит)
- Якщо ні — самостійно збирає SERP і скрапить конкурентів
- Підтримує власну структуру заголовків (через OutlineBuilder)

**Структура ТЗ:** мета, ролі, таблиця конкурентів, рекомендовані параметри, LSI-слова, структура H1-H3, FAQ, мета-теги, slug.

**Експорт:** Word (.docx), передача до інструменту генерації контенту

---

### 4.3 AI-генерація контенту (Content Tool)
**Маршрут:** `/content`

Генерує SEO-оптимізовані статті через Gemini AI:
- Приймає: тему, ключові слова, тон (інформаційний / комерційний / експертний / розмовний), обсяг (500–5000 слів)
- Системний промпт включає правила anti-AI: Burstiness (чергування довжини речень), Perplexity (непередбачуваність фраз), заборонені кліше
- Вибір моделі Gemini або автоматичний режим (Smart Fallback)
- Перевірка якості ContentQuality (щільність ключових слів, структура, читабельність)

**Експорт:** Word (.docx), публікація напряму в WordPress

---

### 4.4 Автоматична SEO-кампанія (Campaign Tool)
**Маршрут:** `/campaign`

Повністю автоматизований 5-кроковий пайплайн:

```
Ключове слово
      │
      ▼
[Крок 1] SERP Analysis ─── SearXNG → скрапінг ТОП-10
      │
      ▼
[Крок 2] PageSpeed Audit ── Google PageSpeed API → перший конкурент
      │
      ▼
[Крок 3] LSI-аналіз ─────── частотний аналіз текстів конкурентів
      │
      ▼
[Крок 4] Генерація ТЗ ───── Gemini AI (з даними SERP)
      │                      ↑ опційна пауза: OutlineBuilder
      ▼
[Крок 5] Генерація статті ── Gemini AI (тема + топ-10 LSI-слів)
      │
      ▼
Результат: ТЗ + стаття + LSI-таблиця + PageSpeed → Excel
```

**Особливості:**
- Опційний режим ручної структури: кампанія зупиняється перед кроком 4, показує OutlineBuilder з заголовками конкурентів, дозволяє обрати/додати власні → продовжує
- Smart Fallback: при перевантаженні Gemini Pro автоматично переходить на Flash
- Індикатор поточної моделі поруч з прогрес-баром
- Всі результати зберігаються та доступні у вкладках після завершення

---

### 4.5 LSI-аналіз
**Маршрут:** `/lsi`

Збирає частотні семантично пов'язані слова з ТОП-10:
1. Отримує ТОП-10 через SearXNG
2. Скрапить сторінки, токенізує текст
3. Підраховує: кількість сторінок, де зустрічається слово (docFreq) та загальну частоту
4. Фільтрує стоп-слова, дуже короткі слова та слова що містять саме ключове слово
5. Розраховує рекомендовану кількість вживань

**Вихід:** таблиця LSI-слів з частотністю та рекомендаціями, експорт у Excel

---

### 4.6 PageSpeed Аудит
**Маршрут:** `/pagespeed`

Технічний аудит будь-якого URL через Google PageSpeed Insights API:
- Метрики: Performance, Accessibility, Best Practices, SEO (0–100)
- Детальні дані: LCP, FID, CLS, TTFB
- Порівняння мобільна / десктоп версія
- Колірна індикація: зелений (≥90), оранжевий (≥50), червоний (<50)

---

### 4.7 Семантична кластеризація
**Маршрут:** `/semantic-cluster`

Групує семантично пов'язані ключові слова за принципом спільних URL у видачі:
- Для кожного КС робить запит до SearXNG, збирає ТОП-5 URL
- Об'єднує КС у кластери якщо мають ≥2 спільних URL
- Streaming-відповідь: прогрес у реальному часі
- Підтримує до 100 ключових слів одночасно

**Застосування:** визначення, які КС можна покрити однією сторінкою

---

### 4.8 SEO-перевірка тексту
**Маршрут:** `/seo-checker`

Аналізує готовий текст через Gemini:
- Підраховує: кількість слів/символів, H1/H2/H3, абзаци, списки, середня довжина речення
- Щільність ключових слів (кожного окремо)
- AI-аналіз: читабельність, структура, SEO-оптимізація, конкретні рекомендації з прикладами

---

### 4.9 Розумна перелінковка (Smart Linking)
**Маршрут:** `/smart-linking`

Аналізує текст і пропонує внутрішні посилання:
- Приймає: текст статті + список наявних URL сайту з їх описами
- Gemini знаходить природні місця в тексті для анкорних посилань
- Повертає: фрагмент тексту → URL → анкор → обґрунтування

---

### 4.10 AI-детектор
Вбудований у SEO-checker та окремий API `/api/ai-detect`:
- Лінгвістичний аналіз: Burstiness score, Perplexity score, частота кліше
- Числові метрики + Gemini-оцінка
- Результат: % ймовірності AI-написання + конкретні проблемні місця

---

### 4.11 Конструктор структури (OutlineBuilder)
Компонент, що використовується всередині кампанії та BriefTool:
- Підтягує заголовки конкурентів через `/api/fetch-competitor-headings`
- Drag-and-drop вибір заголовків із результатів пошуку
- Можливість додати власні H2/H3
- Передає структуру в генерацію ТЗ

---

### 4.12 Журнал дій (History)
**Маршрут:** `/history`

Зберігає останні результати роботи інструментів у localStorage:
- Тип інструменту, запит, дата, превью результату
- Швидкий перегляд та копіювання

---

## 5. API-ендпоінти

Всі ендпоінти: `POST /api/...` якщо не вказано інше. Базовий URL: `https://aiagentlab.fun`

### Основні

| Ендпоінт | Метод | Параметри | Опис |
|---|---|---|---|
| `/api/health` | GET | — | Перевірка стану сервера |
| `/api/serp-analyze` | POST | `keyword, region, language` | SERP + скрапінг + AI-аналіз |
| `/api/generate-brief` | POST | `keyword, language, region, contentType, serpData?, customStructure?, model?` | Генерація ТЗ |
| `/api/generate-content` | POST | `topic, keywords, tone, wordCount, model?` | Генерація статті |
| `/api/lsi-analyze` | POST | `keyword, region` | LSI-аналіз ТОП-10 |
| `/api/pagespeed` | GET | `?url=` | Аудит PageSpeed |
| `/api/seo-check` | POST | `content, keywords, stats` | SEO-аналіз тексту |
| `/api/smart-linking` | POST | `text, pages` | Рекомендації перелінковки |
| `/api/ai-detect` | POST | `text` | Детекція AI-тексту |

### Streaming (SSE)

| Ендпоінт | Параметри | Опис |
|---|---|---|
| `/api/semantic-cluster-stream` | `keywords[], region` | Кластеризація з прогресом |
| `/api/plagiarism-stream` | `text, lang` | Перевірка унікальності |

### Допоміжні

| Ендпоінт | Параметри | Опис |
|---|---|---|
| `/api/fetch-competitor-headings` | `keyword, region` | Заголовки конкурентів для OutlineBuilder |
| `/api/rewrite-fragment` | `fragments[]` | Переписати фрагменти тексту |
| `/api/wp-publish` | `siteUrl, username, password, title, content, status` | Публікація в WordPress |

### Формат відповіді при помилці

```json
{
  "error": "Опис помилки",
  "overloaded": true
}
```

При перевантаженні Gemini (`overloaded: true`) сервер повертає HTTP 503 — це сигнал для клієнта активувати Smart Fallback.

---

## 6. Smart Model Fallback

Система автоматичного перемикання моделей при перевантаженні Gemini.

### Ієрархія моделей

```
gemini-1.5-pro          (найпотужніша, строгі ліміти)
       │ при 429/503
       ▼
gemini-2.0-flash        (швидка, збалансована)
       │ при 429/503
       ▼
gemini-1.5-flash        (максимальна швидкість, найвищі ліміти)
```

### Режими роботи

**Автоматичний режим (рекомендовано)** — система сама обирає модель, починаючи з найпотужнішої. При помилці перевантаження (`overloaded: true` або HTTP 503) автоматично переходить до наступної моделі, показуючи toast-сповіщення.

**Ручний вибір** — користувач фіксує конкретну модель. Fallback не відбувається.

### Реалізація (`src/lib/geminiFallback.ts`)

```typescript
await callWithModelFallback(
  "/api/generate-content",
  { topic, keywords, tone, wordCount },
  "auto",                             // або конкретна модель
  (id, label) => setActiveModel(label) // колбек при зміні моделі
);
```

При кожній зміні моделі показується toast:
> _"Gemini 1.5 Pro перевантажений, перемикаюсь на Gemini 2.0 Flash..."_
> _"Сервер Google трохи втомився — підбираємо вільну модель"_

### Де застосовується
- **ContentForm** — генерація статті
- **Campaign** — крок 4 (генерація ТЗ) та крок 5 (генерація статті)
- Індикатор `⚡ Використовується: Gemini 2.0 Flash` відображається під час генерації

---

## 7. Інтеграції

### 7.1 Google Gemini API

Єдина точка звернення — функція `callGemini()` у `server/index.js`:
```
URL: https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
Auth: API key у query params
```

Параметри генерації: `temperature: 0.8`, `maxOutputTokens: 8192`, `topP: 0.95`, таймаут: 90с.

Вбудований retry: при 503 до 3 спроб з паузою 3с × номер спроби.

### 7.2 SearXNG (локальний пошуковий агрегатор)

Замінює платні SERP API (DataForSEO, ValueSERP, etc.).

- Запускається в Docker на порту 8888
- Агрегує результати Google + Bing
- Підтримка мов: `uk-UA`, `en-US`, `en-GB`
- Отримує ТОП-10 результатів для аналізу

```bash
# Запуск
docker-compose -f docker-compose.searxng.yml up -d
```

### 7.3 Google PageSpeed Insights API

GET-запит до `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`.
Потребує `PAGESPEED_API_KEY`. Без ключа крок PageSpeed у кампанії пропускається.

### 7.4 WordPress REST API

Публікація статей напряму з інтерфейсу:
- Потребує: URL сайту, логін, application password (не пароль облікового запису)
- Налаштовується в розділі **Integrations** для кожного акаунту окремо
- Зберігається в localStorage прив'язано до username

### 7.5 Supabase

- **Auth**: email/password автентифікація, JWT-токени
- **Database**: зберігання метаданих (за потреби)
- Конфігурується через `VITE_SUPABASE_URL` та `VITE_SUPABASE_ANON_KEY`

---

## 8. Автентифікація та ролі

Система побудована на Supabase Auth.

| Роль | Доступ |
|---|---|
| Незалогінений | Тільки лендінг та сторінка входу |
| Користувач | Всі інструменти, власна історія |
| Адмін | + сторінка `/users` (управління акаунтами) |

Адміністратор визначається за `username === 'admin'` або через Supabase метадані.

Всі захищені маршрути обгорнуті в `<ProtectedRoute>`, який перевіряє стан `AuthContext`. При відсутності сесії — редирект на `/login`.

---

## 9. Деплой та інфраструктура

### Сервер
- **VPS**: Debian, IP `78.27.202.85`
- **Домен**: `aiagentlab.fun` → вказує на VPS
- **TLS**: автоматично через Caddy (Let's Encrypt)

### Caddy (`/etc/caddy/Caddyfile`)
```
aiagentlab.fun {
    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }
    handle {
        root * /var/www/spec-writer-ai
        file_server
        try_files {path} /index.html
    }
}
```

### Node.js API (`systemd`)
```bash
# Сервіс: contentforge-api.service
# WorkingDirectory: /root/spec-writer-ai/server
# ExecStart: /usr/bin/node index.js

systemctl status contentforge-api
systemctl restart contentforge-api
journalctl -u contentforge-api -f    # live логи
```

### SearXNG (`Docker`)
```bash
docker-compose -f docker-compose.searxng.yml up -d
docker-compose -f docker-compose.searxng.yml ps
```

### Деплой нової версії
```bash
# 1. Зібрати фронтенд
cd /root/spec-writer-ai
npm run build

# 2. Скопіювати в директорію Caddy
cp -r dist/. /var/www/spec-writer-ai/

# 3. Перезапустити API (якщо змінювався server/index.js)
systemctl restart contentforge-api
```

---

## 10. Змінні оточення

### `server/.env`
```env
# Gemini AI
GEMINI_API_KEY=ваш_ключ_від_Google_AI_Studio
GEMINI_MODEL=gemini-flash-latest        # модель за замовчуванням

# SearXNG
SEARXNG_URL=http://127.0.0.1:8888

# Google PageSpeed (необов'язково)
PAGESPEED_API_KEY=ваш_ключ

# Порт сервера
PORT=3001
```

### `.env` (фронтенд, якщо потрібно для локальної розробки)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

### Де отримати ключі
| Ключ | Де взяти |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `PAGESPEED_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → PageSpeed Insights API |
| Supabase ключі | [supabase.com](https://supabase.com) → Project Settings → API |

---

## 11. Локальна розробка

### Вимоги
- Node.js ≥ 18
- Docker (для SearXNG)

### Запуск

```bash
# 1. Клонувати репозиторій
git clone <repo-url>
cd spec-writer-ai

# 2. Встановити залежності фронтенду
npm install

# 3. Встановити залежності сервера
cd server && npm install && cd ..

# 4. Створити server/.env (див. розділ 10)

# 5. Запустити SearXNG
docker-compose -f docker-compose.searxng.yml up -d

# 6. Запустити API-сервер
cd server && node index.js &

# 7. Запустити dev-сервер фронтенду
npm run dev
```

Фронтенд буде доступний на `http://localhost:8080`, API на `http://localhost:3001`.

Проксі Vite налаштований у `vite.config.ts` — усі запити `/api/*` автоматично перенаправляються на `localhost:3001`.

### Корисні команди

```bash
npm run build          # Зібрати фронтенд у dist/
npm run dev            # Dev-сервер з hot-reload
npm run lint           # ESLint перевірка

# Перевірка API
curl http://localhost:3001/api/health

# Логи API на сервері
journalctl -u contentforge-api -f

# Логи SearXNG
docker-compose -f docker-compose.searxng.yml logs -f
```

---

## Схема потоку даних: Автоматична кампанія

```
Користувач вводить: "купити ноутбук"
         │
         ▼
SearXNG → Google/Bing → ТОП-10 URL
         │
         ▼
Паралельний скрапінг 10 сторінок
  └── HTML парсинг → заголовки, слова, зображення
         │
         ├─────────────────────────────────────┐
         ▼                                     ▼
  PageSpeed API                     Частотний аналіз
  (перший конкурент)                (токенізація всіх текстів)
  → scores: perf/a11y/bp/seo        → LSI-слова з частотою
         │                                     │
         └──────────────┬──────────────────────┘
                        ▼
               Gemini AI: генерація ТЗ
               (із SERP-даними + LSI)
                        │
                        ▼ (опційно: пауза → OutlineBuilder)
                        │
               Gemini AI: генерація статті
               (тема + топ-10 LSI-слів)
                        │
                        ▼
              Результат у 3 вкладках:
              • Аналіз + LSI-таблиця
              • Готове ТЗ (Word / WP)
              • Стаття (Word / WP / Excel)
```

---

*ContentForge — закрита платформа. Для доступу потрібен акаунт.*
