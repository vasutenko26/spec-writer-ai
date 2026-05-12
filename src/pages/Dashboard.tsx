import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, FileText, Sparkles, BarChart3,
  ArrowRight, LogOut, Trash2, CheckCircle2, Users, ShieldCheck,
  FileBarChart, Gauge, Network, Link2, Rocket, History, Lock, BookOpen,
  FolderOpen, Lightbulb, CalendarDays, Archive, Tags,
} from "lucide-react";
import type { ToolId } from "@/contexts/AuthContext";

const coreTools: {
  path: string;
  icon: React.ElementType;
  step: string;
  title: string;
  description: string;
  stateKey: "serpResult" | "briefResult" | "contentResult" | "seoResult";
  color: string;
  bg: string;
  border: string;
  toolId: ToolId;
}[] = [
  {
    path: "/tools/serp",
    icon: Search,
    step: "01",
    title: "Аналіз пошукової видачі",
    description: "Аналіз ТОП-10 конкурентів: структура матеріалів, заголовки, семантика та огляд ринку",
    stateKey: "serpResult",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "group-hover:border-blue-500/40",
    toolId: "serp",
  },
  {
    path: "/tools/brief",
    icon: FileText,
    step: "02",
    title: "Генерація ТЗ",
    description: "Детальне технічне завдання для копірайтера з усіма вимогами. Використовує дані аналізу видачі.",
    stateKey: "briefResult",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "group-hover:border-primary/40",
    toolId: "brief",
  },
  {
    path: "/tools/content",
    icon: Sparkles,
    step: "03",
    title: "Генерація контенту",
    description: "SEO-оптимізована стаття з урахуванням ТЗ, структури конкурентів та цільових метрик.",
    stateKey: "contentResult",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "group-hover:border-purple-500/40",
    toolId: "content",
  },
  {
    path: "/tools/seo",
    icon: BarChart3,
    step: "04",
    title: "SEO-перевірка",
    description: "Аналіз готового матеріалу: обсяг, щільність ключових слів, структура заголовків та оцінка якості.",
    stateKey: "seoResult",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "group-hover:border-orange-500/40",
    toolId: "seo",
  },
];

const advancedTools: {
  path: string;
  icon: React.ElementType;
  title: string;
  description: string;
  stateKey: "lsiResult" | "pagespeedResult" | "clusterResult" | "linkingResult" | "keywordsResult";
  color: string;
  bg: string;
  border: string;
  toolId: ToolId;
}[] = [
  {
    path: "/tools/lsi",
    icon: FileBarChart,
    title: "LSI та TF-IDF Аналізатор",
    description: "Збирає тексти з ТОП-10 і визначає частотні LSI-слова з рекомендованою кількістю вживань.",
    stateKey: "lsiResult",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "group-hover:border-cyan-500/40",
    toolId: "lsi",
  },
  {
    path: "/tools/pagespeed",
    icon: Gauge,
    title: "Технічний SEO-аудит",
    description: "Lighthouse-аудит сторінки: продуктивність, доступність, SEO та перелік критичних помилок.",
    stateKey: "pagespeedResult",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "group-hover:border-emerald-500/40",
    toolId: "pagespeed",
  },
  {
    path: "/tools/cluster",
    icon: Network,
    title: "Кластеризатор семантики",
    description: "Порівнює пошукову видачу для списку ключів і групує їх у тематичні кластери.",
    stateKey: "clusterResult",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "group-hover:border-violet-500/40",
    toolId: "cluster",
  },
  {
    path: "/tools/linking",
    icon: Link2,
    title: "Розумна перелінковка",
    description: "Аналізує текст статті та пропонує 3-5 місць для внутрішніх посилань з анкорами та обґрунтуванням.",
    stateKey: "linkingResult",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "group-hover:border-rose-500/40",
    toolId: "linking",
  },
  {
    path: "/tools/keywords",
    icon: Tags,
    title: "Дослідження ключових слів",
    description: "Збір семантики через SE Ranking + AI-кластеризація для PPC та SEO.",
    stateKey: "keywordsResult",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "group-hover:border-pink-500/40",
    toolId: "keywords",
  },
];

// ── Tool card ─────────────────────────────────────────────────────────────────

type CoreTool = (typeof coreTools)[0];
type AdvancedTool = (typeof advancedTools)[0];

const ToolCard = ({
  tool,
  hasData,
  allowed,
  onClick,
}: {
  tool: CoreTool | AdvancedTool;
  hasData: boolean;
  allowed: boolean;
  onClick: () => void;
}) => {
  if (!allowed) {
    return (
      <div className="relative text-left rounded-xl border border-border bg-card/50 p-5 opacity-60 cursor-not-allowed select-none">
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="hidden sm:inline">Закрито</span>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <tool.icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            {"step" in tool && (
              <span className="text-xs font-mono text-muted-foreground opacity-70 mr-2">{tool.step}</span>
            )}
            <span className="font-semibold text-sm text-muted-foreground leading-tight">{tool.title}</span>
            <p className="text-xs text-muted-foreground/60 leading-relaxed mt-1">Доступ закрито адміністратором</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md ${tool.border} hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/30`}
    >
      {hasData && (
        <span className="absolute top-4 right-4 flex items-center gap-1 text-xs text-primary font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Є дані</span>
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.bg} transition-transform group-hover:scale-110`}>
          <tool.icon className={`h-5 w-5 ${tool.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          {"step" in tool && (
            <span className={`text-xs font-mono ${tool.color} opacity-70 mr-2`}>{tool.step}</span>
          )}
          <span className="font-semibold text-sm leading-tight">{tool.title}</span>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{tool.description}</p>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
        Відкрити <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, currentUser, isAdmin, hasToolAccess } = useAuth();
  const appState = useAppState();

  const hasAnyData = coreTools.some((t) => !!appState[t.stateKey]) ||
    advancedTools.some((t) => !!appState[t.stateKey]);

  const campaignAllowed = hasToolAccess("campaign");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 max-w-5xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero-gradient">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">ContentForge</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                {isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                <span>{currentUser.username}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/help")}
              className="text-muted-foreground hover:text-foreground text-xs gap-1"
              title="Довідник"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Довідник</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/history")}
              className="text-muted-foreground hover:text-foreground text-xs gap-1"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Історія</span>
            </Button>
            {hasAnyData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => appState.clearAll()}
                className="text-muted-foreground hover:text-destructive text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Очистити дані</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { logout(); navigate("/login"); }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Вийти"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-10 max-w-5xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Головна панель</h1>
          <p className="text-muted-foreground text-sm">Оберіть інструмент або продовжте роботу з попереднього кроку</p>
        </div>

        {/* 1. Marketing projects */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Маркетинг</h2>
            <div className="h-px flex-1 bg-border" />
            <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">Новинка</Badge>
          </div>
          <button
            onClick={() => navigate("/projects")}
            className="group w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/40 hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">Маркетингові проєкти</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  База знань → Гіпотези зростання → Аналіз аномалій → Контент-план → Розвідка конкурентів.
                  Всі рішення будуються на фреймворках Growth Engine та Content-Eval.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {[
                    { icon: Lightbulb, label: "Гіпотези", color: "text-amber-500" },
                    { icon: CalendarDays, label: "Контент-план", color: "text-emerald-500" },
                    { icon: Users, label: "Конкуренти", color: "text-violet-500" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Відкрити проєкти <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* 2. My Content */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Контент</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={() => navigate("/my-content")}
            className="group w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/40 hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">Мій контент</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Усі збережені публікації та ТЗ в одному місці. Організуйте в папки, фільтруйте за статусом.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {[
                    { icon: Sparkles, label: "Публікації", color: "text-purple-500" },
                    { icon: FileText, label: "ТЗ", color: "text-primary" },
                    { icon: FolderOpen, label: "Папки", color: "text-amber-500" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Відкрити <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* 3. Campaign (Automation) */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Автоматизація</h2>
            <div className="h-px flex-1 bg-border" />
            <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">Новинка</Badge>
          </div>
          {campaignAllowed ? (
            <button
              onClick={() => navigate("/tools/campaign")}
              className="group w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/40 hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Автоматична SEO-кампанія</span>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Комбайн</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Один ввід — повний цикл: аналіз видачі → технічний аудит → LSI → ТЗ → стаття → ZIP-архів з усіма матеріалами.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Запустити <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ) : (
            <div className="relative w-full rounded-xl border border-border bg-card/50 p-5 opacity-60 cursor-not-allowed select-none">
              <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span className="hidden sm:inline">Закрито</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Rocket className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-sm text-muted-foreground">Автоматична SEO-кампанія</span>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed mt-1">Доступ закрито адміністратором</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Admin section — full-width like the two above */}
        {isAdmin && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Адміністрування</h2>
              <Badge variant="outline" className="text-xs py-0 h-4 border-primary/30 text-primary bg-primary/5">Admin</Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={() => navigate("/admin/users")}
              className="group w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/40 hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Управління користувачами</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Створення, редагування та видалення облікових записів. Налаштування доступу до інструментів.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Відкрити <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* Workflow hint */}
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-4 py-2.5 w-fit">
          {coreTools.map((t, i) => (
            <span key={t.step} className="flex items-center gap-2">
              <span className={`font-mono ${t.color}`}>{t.step}</span>
              <span>{t.title.split(" ")[0]}</span>
              {i < coreTools.length - 1 && <ArrowRight className="h-3 w-3 shrink-0" />}
            </span>
          ))}
        </div>

        {/* 4. Core tools */}
        <div className="grid gap-4 md:grid-cols-2">
          {coreTools.map((tool) => (
            <ToolCard
              key={tool.path}
              tool={tool}
              hasData={!!appState[tool.stateKey]}
              allowed={hasToolAccess(tool.toolId)}
              onClick={() => navigate(tool.path)}
            />
          ))}
        </div>

        {/* 5. Advanced tools */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Розширені інструменти</h2>
            <div className="h-px flex-1 bg-border" />
            <Badge variant="outline" className="text-xs">Нові</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {advancedTools.map((tool) => (
              <ToolCard
                key={tool.path}
                tool={tool}
                hasData={!!appState[tool.stateKey]}
                allowed={hasToolAccess(tool.toolId)}
                onClick={() => navigate(tool.path)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
