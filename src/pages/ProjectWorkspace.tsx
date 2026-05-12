import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, LogOut, BookOpen, Lightbulb, BarChart3,
  CalendarDays, Users2, FileText, FolderOpen, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "/api";

export interface Project {
  id: number;
  name: string;
  description: string;
  niche: string;
  has_kb: number;
  hypothesis_count: number;
  accepted_count: number;
  rejected_count: number;
  plan_count: number;
  report_count: number;
}

const navItems = [
  {
    key: "kb",
    label: "База знань",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    activeBg: "bg-blue-500/15",
    activeBorder: "border-blue-500/40",
    description: "Дані про продукт та аудиторію",
  },
  {
    key: "hypotheses",
    label: "Гіпотези",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    activeBg: "bg-amber-500/15",
    activeBorder: "border-amber-500/40",
    description: "Гіпотези для тестування",
  },
  {
    key: "anomalies",
    label: "Аномалії",
    icon: BarChart3,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    activeBg: "bg-rose-500/15",
    activeBorder: "border-rose-500/40",
    description: "Аналіз результатів",
  },
  {
    key: "content-plan",
    label: "Контент-план",
    icon: CalendarDays,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    activeBg: "bg-emerald-500/15",
    activeBorder: "border-emerald-500/40",
    description: "30-денний план публікацій",
  },
  {
    key: "competitors",
    label: "Конкуренти",
    icon: Users2,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    activeBg: "bg-violet-500/15",
    activeBorder: "border-violet-500/40",
    description: "Розвідка та аналіз ринку",
  },
];

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSection = navItems.find((item) =>
    location.pathname.includes(`/projects/${id}/${item.key}`)
  );

  useEffect(() => {
    if (!id) return;
    apiFetch(`${API}/projects/${id}`)
      .then((r) => r.json())
      .then(setProject)
      .catch((e) => toast.error(e.message));
  }, [id]);

  const navigateTo = (key: string) => {
    navigate(`/projects/${id}/${key}`);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate("/projects")}
              className="text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Проєкти</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate max-w-[180px]">
                {project?.name || "Завантаження..."}
              </span>
              {project?.niche && (
                <Badge variant="outline" className="text-[10px] hidden sm:flex">
                  {project.niche}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 hover:opacity-80">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-hero-gradient">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold hidden md:block">ContentForge</span>
            </button>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 md:hidden text-muted-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => { logout(); navigate("/login"); }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hidden md:flex"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <aside className={cn(
          "w-64 shrink-0 border-r border-border bg-card/50 min-h-[calc(100vh-57px)]",
          "fixed md:sticky top-[57px] left-0 z-40 md:z-auto h-[calc(100vh-57px)]",
          "transition-transform duration-200 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-3 px-1">
              Розділи проєкту
            </p>
            {navItems.map((item) => {
              const isActive = location.pathname.includes(`/projects/${id}/${item.key}`);
              return (
                <button
                  key={item.key}
                  onClick={() => navigateTo(item.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    isActive
                      ? `${item.activeBg} border ${item.activeBorder}`
                      : "hover:bg-secondary/60 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isActive ? item.activeBg : item.bg
                  )}>
                    <item.icon className={cn("h-4 w-4", item.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("text-sm font-medium", isActive && item.color)}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Project stats */}
            {project && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-1">
                  Статистика
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Гіпотез", value: project.hypothesis_count, color: "text-amber-500" },
                    { label: "Прийнято", value: project.accepted_count, color: "text-emerald-500" },
                    { label: "Планів", value: project.plan_count, color: "text-blue-500" },
                    { label: "Звітів", value: project.report_count, color: "text-violet-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-secondary/40 px-2 py-1.5 text-center">
                      <div className={cn("text-lg font-bold", color)}>{value}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6">
          {/* Section breadcrumb */}
          {currentSection && (
            <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
              <currentSection.icon className={cn("h-4 w-4", currentSection.color)} />
              <span className={cn("font-medium", currentSection.color)}>{currentSection.label}</span>
            </div>
          )}
          <Outlet context={{ project, setProject }} />
        </main>
      </div>
    </div>
  );
};

export default ProjectWorkspace;
export type { Project };
