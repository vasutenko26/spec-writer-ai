# ContentForge Architecture Documentation

## For Claude Code / AI Assistants

This document provides a comprehensive overview of the ContentForge codebase architecture to help AI assistants understand the project structure and make informed changes.

## 🎯 Project Overview

**Name**: ContentForge (aiagentlab.fun)
**Purpose**: SEO content generation platform powered by Google Gemini AI
**Tech Stack**: React 18 + TypeScript + Node.js + Express + SQLite
**Deployment**: Caddy + Systemd + Docker (SearXNG)

## 📂 Project Structure

```
spec-writer-ai/
├── src/                          # React Frontend (TypeScript)
│   ├── pages/                    # Route pages
│   │   ├── LoginPage.tsx         # Authentication
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── BriefTool.tsx         # Brief generation tool
│   │   ├── ContentTool.tsx       # Content generation tool
│   │   ├── SerpAnalysis.tsx      # SERP analyzer
│   │   ├── CampaignTool.tsx      # Automated campaign
│   │   ├── LsiTool.tsx           # LSI keyword analysis
│   │   ├── PageSpeedTool.tsx     # PageSpeed audit
│   │   ├── SemanticClusterTool.tsx # Keyword clustering
│   │   ├── SeoChecker.tsx        # Content SEO checker
│   │   ├── SmartLinkingTool.tsx  # Internal linking
│   │   ├── ProjectsPage.tsx      # Projects management
│   │   ├── ProjectWorkspace.tsx  # Single project view
│   │   ├── HistoryPage.tsx       # Action history
│   │   ├── IntegrationsPage.tsx  # WordPress integration
│   │   ├── UsersAdmin.tsx        # User management (admin)
│   │   ├── HelpDocs.tsx          # Help documentation
│   │   └── project/              # Project-specific pages
│   │       ├── ContentPlan.tsx
│   │       ├── Hypotheses.tsx
│   │       ├── KnowledgeBase.tsx
│   │       ├── CompetitorIntel.tsx
│   │       └── AnomalyAnalysis.tsx
│   │
│   ├── components/               # React components
│   │   ├── AppLayout.tsx         # Main layout with sidebar
│   │   ├── ProtectedRoute.tsx    # Auth guard HOC
│   │   ├── BriefForm.tsx         # Brief generation form
│   │   ├── BriefResult.tsx       # Brief display
│   │   ├── ContentForm.tsx       # Content generation form
│   │   ├── WordPressModal.tsx    # WP publish modal
│   │   ├── tools/                # Tool-specific components
│   │   └── ui/                   # shadcn/ui components
│   │
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.tsx       # Supabase authentication
│   │   ├── AppStateContext.tsx   # Shared state between tools
│   │   └── HistoryContext.tsx    # Action history tracking
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── geminiFallback.ts     # Smart Model Fallback logic
│   │   ├── exportDocx.ts         # Markdown to Word export
│   │   ├── wordpress.ts          # WordPress REST API client
│   │   └── utils.ts              # General utilities
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-toast.ts          # Toast notifications
│   │   └── use-mobile.tsx        # Mobile detection
│   │
│   ├── integrations/supabase/    # Supabase client
│   │   ├── client.ts
│   │   └── types.ts
│   │
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # Entry point
│
├── server/                       # Node.js Backend (ESM)
│   ├── index.js                  # Main server file (Express)
│   ├── routes/                   # API route handlers
│   │   ├── auth.js               # JWT authentication
│   │   ├── projects.js           # Project CRUD
│   │   ├── briefs.js             # Brief operations
│   │   ├── publications.js       # Publication management
│   │   ├── folders.js            # Folder management
│   │   ├── shares.js             # Sharing functionality
│   │   ├── gsc.js                # Google Search Console
│   │   ├── knowledgeBase.js      # Knowledge base
│   │   ├── hypotheses.js         # Hypothesis management
│   │   ├── anomalies.js          # Anomaly detection
│   │   ├── contentPlan.js        # Content planning
│   │   └── competitors.js        # Competitor analysis
│   │
│   ├── middleware/               # Express middleware
│   │   └── auth.js               # JWT verification
│   │
│   ├── services/                 # Business logic
│   │   └── ClaudeCLIWrapper.js   # Claude CLI integration
│   │
│   ├── db/                       # Database
│   │   ├── database.js           # SQLite initialization
│   │   └── contentforge.db       # SQLite database file
│   │
│   ├── prompts/                  # AI prompts
│   └── package.json              # Backend dependencies
│
├── deployment/                   # Deployment configs
│   ├── deploy.sh                 # Auto-deployment script
│   ├── contentforge-api.service  # Systemd service
│   └── Caddyfile.example         # Caddy config template
│
├── searxng/                      # SearXNG configuration
│   └── settings.yml
│
├── docker-compose.searxng.yml    # SearXNG Docker setup
├── vite.config.ts                # Vite build config
├── tailwind.config.ts            # Tailwind CSS config
├── package.json                  # Frontend dependencies
├── .env.example                  # Frontend env template
├── server/.env.example           # Backend env template
├── README.md                     # Main documentation (Ukrainian)
├── DEPLOYMENT.md                 # Deployment guide (English)
└── ARCHITECTURE.md               # This file
```

## 🔧 Key Technologies

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.x** - Type safety
- **Vite 5.4** - Build tool & dev server
- **TailwindCSS 3.x** - Styling
- **shadcn/ui** - UI components (Radix UI based)
- **React Router v6** - Client-side routing
- **TanStack Query v5** - Server state management
- **Sonner** - Toast notifications
- **ReactMarkdown** - Markdown rendering
- **docx** - Word document export
- **XLSX + FileSaver** - Excel export

### Backend
- **Node.js 18+** - Runtime (ESM modules)
- **Express 4** - HTTP server framework
- **SQLite3** - Database (better-sqlite3)
- **node-html-parser** - HTML parsing for scraping
- **marked** - Markdown to HTML conversion
- **dotenv** - Environment variables
- **jsonwebtoken** - JWT authentication

### Infrastructure
- **Caddy 2.x** - Reverse proxy + automatic HTTPS
- **Systemd** - Process management
- **Docker** - SearXNG containerization
- **Supabase** - Authentication + cloud database

## 🔄 Request Flow

### Frontend → Backend
1. User interacts with React page
2. Component calls API via fetch/TanStack Query
3. Request goes to Vite dev server (dev) or Caddy (prod)
4. `/api/*` proxied to Node.js (port 3001)
5. Express routes handle request
6. Response sent back to frontend

### Data Flow Example: Content Generation
```
ContentTool.tsx
    ↓ (user submits form)
ContentForm.tsx → callWithModelFallback()
    ↓ (POST /api/generate-content)
geminiFallback.ts → tries models in order
    ↓
server/index.js → /api/generate-content endpoint
    ↓
callGemini(prompt, model)
    ↓
Google Gemini API
    ↓ (generated content)
Response → frontend
    ↓
Display in ContentTool.tsx
```

## 🎨 Frontend Architecture

### Routing (`App.tsx`)
All routes wrapped in `<BrowserRouter>`:
- `/` - Landing page (public)
- `/login` - Login page (public)
- `/dashboard` - Main dashboard (protected)
- `/brief` - Brief tool (protected)
- `/content` - Content tool (protected)
- `/serp-analysis` - SERP analyzer (protected)
- `/campaign` - Automated campaign (protected)
- `/lsi` - LSI analysis (protected)
- `/pagespeed` - PageSpeed audit (protected)
- `/semantic-cluster` - Keyword clustering (protected)
- `/seo-checker` - SEO checker (protected)
- `/smart-linking` - Smart linking (protected)
- `/projects` - Projects list (protected)
- `/projects/:id` - Single project (protected)
- `/history` - Action history (protected)
- `/integrations` - WordPress setup (protected)
- `/users` - User management (admin only)

### Authentication Flow
1. `AuthContext` manages auth state via Supabase
2. `ProtectedRoute` component guards private routes
3. JWT token stored in localStorage
4. Token sent with API requests in Authorization header

### State Management
- **Global Auth**: `AuthContext` (Supabase session)
- **Tool State**: `AppStateContext` (SERP data, analysis results)
- **History**: `HistoryContext` (localStorage)
- **Server State**: TanStack Query (API calls, caching)
- **Local State**: React useState/useReducer

### Smart Model Fallback
Located in `src/lib/geminiFallback.ts`:
```typescript
const MODEL_HIERARCHY = [
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

// Tries models in order on 503/429 errors
await callWithModelFallback(endpoint, data, mode, callback);
```

## 🗄️ Backend Architecture

### Express Server (`server/index.js`)
- **Port**: 3001 (localhost only)
- **CORS**: Enabled for frontend
- **Body parsing**: JSON (10mb limit for large content)
- **Static files**: None (served by Caddy)

### Database (`server/db/database.js`)
SQLite with better-sqlite3:
```sql
-- Main tables
users (id, username, email, password_hash, role, created_at)
projects (id, name, description, user_id, created_at, updated_at)
briefs (id, project_id, keyword, content, metadata, created_at)
publications (id, project_id, title, content, status, created_at, published_at)
folders (id, user_id, name, parent_id, created_at)
shares (id, item_type, item_id, user_id, permissions)
knowledge_base (id, project_id, content, source, created_at)
hypotheses (id, project_id, hypothesis, status, created_at)
anomalies (id, project_id, url, anomaly_type, severity, created_at)
content_plan (id, project_id, topic, status, scheduled_date)
competitors (id, project_id, domain, url, metrics, created_at)
```

### API Endpoints

#### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/serp-analyze` | SERP analysis + scraping |
| POST | `/api/generate-brief` | Generate SEO brief |
| POST | `/api/generate-content` | Generate article |
| POST | `/api/lsi-analyze` | LSI keyword analysis |
| GET | `/api/pagespeed` | PageSpeed audit |
| POST | `/api/seo-check` | SEO content check |
| POST | `/api/smart-linking` | Internal linking suggestions |
| POST | `/api/ai-detect` | AI content detection |

#### Project Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

#### Streaming Endpoints (SSE)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/semantic-cluster-stream` | Keyword clustering with progress |
| POST | `/api/plagiarism-stream` | Plagiarism check with progress |

### External API Integrations

#### Google Gemini API
```javascript
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

// Retry logic: 3 attempts on 503 errors
// Timeout: 90 seconds
// Temperature: 0.8
// Max tokens: 8192
```

#### SearXNG (Local Search)
```javascript
const SEARXNG_URL = 'http://127.0.0.1:8888/search';
// Aggregates Google + Bing results
// Returns TOP-10 URLs for analysis
// Supports languages: uk-UA, en-US, en-GB
```

#### Google PageSpeed API
```javascript
const PAGESPEED_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// Returns: performance, accessibility, best-practices, SEO scores
// Desktop + mobile metrics
```

## 🐳 Docker Services

### SearXNG Container
```yaml
services:
  searxng:
    image: searxng/searxng:latest
    ports:
      - "8888:8080"
    volumes:
      - ./searxng:/etc/searxng:rw
    environment:
      - SEARXNG_BASE_URL=http://localhost:8888/
```

## 🔐 Authentication & Authorization

### JWT Flow
1. User logs in via `/api/auth/login`
2. Server verifies credentials against SQLite
3. Server generates JWT with payload: `{ userId, username, role }`
4. Frontend stores JWT in localStorage
5. All API requests include: `Authorization: Bearer <token>`
6. Middleware `auth.js` verifies token on protected routes

### Roles
- **user** - Standard user (all tools)
- **admin** - Admin (all tools + user management)

## 🎯 Key Features Implementation

### 1. SERP Analysis (`/api/serp-analyze`)
1. Query SearXNG for TOP-10 URLs
2. Parallel scrape all 10 pages (8s timeout each)
3. Parse HTML with node-html-parser
4. Extract: H1-H6, word count, images, lists
5. Send data to Gemini for analysis
6. Return: competitor table, AI insights, stats

### 2. Brief Generation (`/api/generate-brief`)
1. Use cached SERP data or fetch new
2. Construct prompt with competitor data
3. Call Gemini with structured prompt
4. Return: Markdown brief with structure, LSI, FAQ

### 3. Content Generation (`/api/generate-content`)
1. Accept: topic, keywords, tone, word count
2. Build anti-AI prompt (burstiness, perplexity rules)
3. Call Gemini with Smart Fallback
4. Return: SEO-optimized article in Markdown

### 4. Automated Campaign (`CampaignTool.tsx`)
5-step pipeline:
1. SERP Analysis
2. PageSpeed Audit (first competitor)
3. LSI Analysis (frequency analysis)
4. Brief Generation (with optional OutlineBuilder pause)
5. Content Generation (with top LSI keywords)

### 5. LSI Analysis (`/api/lsi-analyze`)
1. Fetch TOP-10 via SearXNG
2. Scrape all pages
3. Tokenize text, count frequencies
4. Filter stop words and short words
5. Calculate recommended usage
6. Return: LSI table with metrics

## 🛠️ Development Workflow

### Local Development
```bash
# Terminal 1: Start backend
cd server && node index.js

# Terminal 2: Start SearXNG
docker-compose -f docker-compose.searxng.yml up

# Terminal 3: Start frontend
npm run dev
```

### Building for Production
```bash
# Build frontend
npm run build
# Output: dist/

# Backend runs directly with Node.js
cd server && node index.js
```

### Hot Reload
- Frontend: Vite HMR
- Backend: Manual restart (or use nodemon)

## 📝 Code Style Guidelines

### TypeScript
- Strict mode enabled
- Interfaces for props
- Types for API responses
- No `any` unless absolutely necessary

### React Components
- Functional components only
- Hooks for state management
- Props interfaces defined
- Descriptive component names

### API Endpoints
- RESTful conventions
- Error responses: `{ error: "message", overloaded?: true }`
- Success responses: `{ data: {...} }` or direct data
- Streaming: SSE with `text/event-stream`

### File Naming
- Components: PascalCase (`BriefForm.tsx`)
- Utilities: camelCase (`geminiFallback.ts`)
- Pages: PascalCase (`Dashboard.tsx`)
- Routes: camelCase (`auth.js`)

## 🧪 Testing Strategy

Currently no automated tests. Recommended additions:
- Vitest for unit tests (already configured)
- React Testing Library for component tests
- Supertest for API endpoint tests
- E2E tests with Playwright

## 🚀 Deployment Architecture

### Production Setup
```
Internet
    ↓
Caddy (:443) → SSL termination, reverse proxy
    ↓
    ├─→ /api/* → Node.js Express (:3001)
    └─→ /* → Static files (/var/www/spec-writer-ai/)
```

### Process Management
- **Frontend**: Static files served by Caddy
- **Backend**: Systemd service (`contentforge-api.service`)
- **SearXNG**: Docker container

### Monitoring
- **API Logs**: `journalctl -u contentforge-api -f`
- **Caddy Logs**: `journalctl -u caddy -f`
- **SearXNG Logs**: `docker-compose logs -f`

## 🔄 Update Process

### Code Changes
1. Make changes locally or on server
2. Test in development
3. Commit to git
4. Pull on production server
5. Rebuild frontend: `npm run build`
6. Copy to web dir: `cp -r dist/* /var/www/spec-writer-ai/`
7. Restart API: `systemctl restart contentforge-api`

### Database Changes
SQLite auto-creates tables on first run via `server/db/database.js`.
For schema changes, update initialization script and restart.

## 🔗 Important Integrations

### Supabase
- Used for: Authentication, cloud database (optional)
- Auth method: Email/Password
- JWT tokens managed by Supabase client
- Config: `.env` → `VITE_SUPABASE_*`

### WordPress Publishing
- REST API v2
- Requires: Application Password (not account password)
- Configured per user in Integrations page
- Stored: localStorage (keyed by username)
- Endpoint: `/api/wp-publish`

## 🆘 Common Issues & Solutions

### Issue: Gemini API 503 errors
**Solution**: Smart Fallback automatically tries alternative models

### Issue: SearXNG not returning results
**Solution**: Check Docker container status, restart if needed

### Issue: CORS errors in development
**Solution**: Vite proxy configured in `vite.config.ts`

### Issue: Database locked errors
**Solution**: SQLite in WAL mode, check for stale connections

### Issue: Frontend routing 404s in production
**Solution**: Caddy configured with `try_files {path} /index.html`

## 📊 Performance Considerations

### Frontend
- Code splitting via Vite dynamic imports
- Lazy loading for heavy components
- TanStack Query caching for API responses
- Markdown rendering can be slow for large content

### Backend
- SearXNG scraping: parallel requests, 8s timeout
- Gemini API: 90s timeout, retry logic
- SQLite: WAL mode for concurrent reads
- Consider Redis for caching in future

### Database
- SQLite suitable for <100k records
- For scale, migrate to PostgreSQL
- Regular VACUUM for SQLite optimization

## 🔮 Future Enhancements

Potential improvements:
1. Redis caching layer for API responses
2. PostgreSQL migration for scalability
3. WebSocket for real-time updates
4. Comprehensive test suite
5. API rate limiting
6. User analytics dashboard
7. Multi-language UI support
8. Advanced SEO scoring algorithms

## 📚 Additional Resources

- **Main README**: Detailed Ukrainian documentation
- **DEPLOYMENT.md**: Full deployment guide
- **Supabase Docs**: https://supabase.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **Caddy Docs**: https://caddyserver.com/docs

---

**Last Updated**: 2024-01-XX
**Version**: 1.0
**Maintainer**: See git contributors

This document should be updated whenever significant architectural changes are made.
